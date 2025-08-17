import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

// to do use this instead of the stripe import
@Global()
@Module({
  providers: [
    {
      provide: 'STRIPE_CLIENT', 
      useFactory: (configService: ConfigService): Stripe => {

        const apiKey = configService.get<string>('STRIPE_SECRET_KEY');
        const apiVersion = configService.get<string>('STRIPE_API_VERSION') as Stripe.LatestApiVersion;

        return new Stripe(apiKey!);
      },
      inject: [ConfigService], 
    },
  ],
  exports: ['STRIPE_CLIENT'], 
})
export class StripeModule {}