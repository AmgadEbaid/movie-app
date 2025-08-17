import { BadRequestException, Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { AppService } from './app.service';
import Stripe from 'stripe';
import { ReservationsService } from './reservations/reservations.service';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  private stripe: Stripe;
  private endpointSecret: string;
  
  constructor(
    private readonly reservationsService: ReservationsService, 
    private readonly configService: ConfigService
  ) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY')!);
    this.endpointSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET')!;
  }

  @Post('/stripe-webhook')
  async handleStripeWebhook(@Req() request, @Res() response) {
    const signature = request.headers['stripe-signature'] as string;

    if (!signature) {
      throw new BadRequestException('Missing Stripe signature');
    }

    let event: Stripe.Event;

    try {
      event = Stripe.webhooks.constructEvent(
        (request as any).rawBody,
        signature,
        this.endpointSecret,
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`, err.message);
      return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`Received event: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event);
          break;
          
        case 'checkout.session.expired':
          await this.handleCheckoutSessionExpired(event);
          break;
          
        default:
          console.log(`Unhandled event type: ${event.type} - ignoring`);
          break;
      }

      return response.status(200).json({ received: true });
      
    } catch (error) {
      console.error(`Error processing webhook: ${error.message}`);
      return response.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  private async handleCheckoutSessionCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    const reservationId = session.metadata?.reservation_id;

    if (!reservationId) {
      console.error('Checkout session completed without reservation_id in metadata');
      throw new Error('Missing required metadata');
    }

    // Get charge ID from the session
    let chargeId: string | null = null;
    
    if (session.payment_intent) {
      try {
        const paymentIntent = await this.stripe.paymentIntents.retrieve(
          session.payment_intent as string,
        );
        chargeId = paymentIntent.latest_charge as string;
      } catch (error) {
        console.error('Failed to retrieve payment intent:', error.message);
        // Continue without charge ID if retrieval fails
      }
    }

    console.log(`Payment succeeded for Reservation ID: ${reservationId}`);
    await this.reservationsService.confirmReservation(+reservationId, chargeId!);
  }

  private async handleCheckoutSessionExpired(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    const reservationId = session.metadata?.reservation_id;

    if (!reservationId) {
      console.error('Checkout session expired without reservation_id in metadata');
      throw new Error('Missing required metadata');
    }

    console.log(`Payment session expired for Reservation ID: ${reservationId}`);
    await this.reservationsService.expireReservation(+reservationId);
  }
}