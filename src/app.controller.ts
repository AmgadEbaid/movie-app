import { BadRequestException, Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { AppService } from './app.service';
import Stripe from 'stripe';
import { ReservationsService } from './reservations/reservations.service';
const StripeSDK = require('stripe')('sk_test_51R8lHYGbopedQbOKQUQD2NcJC9BxmUkXetI8cpa69pMffxhF2vz98BU1EruMO1EvRplbx9x7gH6oPrmWgfJPiT5H00zxNEpvJf');
@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private readonly reservationsService: ReservationsService) { }

  @Post('/stripe-webhook')
  async handleStripeWebhook(@Req() request, @Res() response) {
    const signature = request.headers['stripe-signature'] as string;



    // Best Practice: Load this from process.env!
    const endpointSecret = 'whsec_f00903b314303c30f33e8a349c4f5e6b0af6fd704961e6457569eed9df901d52';

    if (!signature) {
      throw new BadRequestException('Missing Stripe signature');
    }

    let event: Stripe.Event; // Define the event variable here

    try {
      // Use request.rawBody which MUST be attached by a middleware
      event = Stripe.webhooks.constructEvent(
        (request as any).rawBody, // Use the rawBody from the request
        signature,
        endpointSecret,
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`, err.message);
      return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const reservationId = session.metadata?.reservation_id;
    console.log('Session metadata:', event);
    const paymentIntent = await StripeSDK.paymentIntents.retrieve(
      session.payment_intent
    );
    const chargeId = paymentIntent.latest_charge;


    // 2. Get the ID of the successful charge from the Payment Intent

    // Guard against events without our metadata
    if (!reservationId) {
      console.error('Webhook received without reservation_id in metadata');
      throw new BadRequestException('Missing required metadata');
    }

    // --- Handle different event types ---

    if (event.type === 'checkout.session.completed') {
      console.log(`Payment succeeded for Reservation ID: ${reservationId}`);

      // Find reservation by ID and update its status to 'PAID'
      // Trigger confirmation email, etc.

      await this.reservationsService.confirmReservation(+reservationId, chargeId);

    } else if (event.type === 'checkout.session.expired') {
      console.log(`Payment session expired for Reservation ID: ${reservationId}`);
      // Find reservation by ID and update its status to 'EXPIRED' or 'CANCELLED'
      // Release the seats back into the pool.
      await this.reservationsService.expireReservation(+reservationId);
    } else if (event.type === 'charge.refunded') {
      const charge = event.data.object;

      // This works perfectly because of the metadata you set on the Checkout Session
      const reservationIdRefund = charge.metadata.reservation_id;
      console.log(`Payment session expired for Reservation ID: ${reservationIdRefund}`);
      // Find reservation by ID and update its status to 'EXPIRED' or 'CANCELLED'
      // Release the seats back into the pool.
      await this.reservationsService.confirmRfund(+reservationIdRefund);
    } else {
      // You can log other event types if you want, but you don't have to handle them.
      console.log(`Received unhandled event type: ${event.type}`);
    }

    // Return a 200 OK to Stripe to acknowledge receipt of the event
    return { status: 'success' };
  }

}
