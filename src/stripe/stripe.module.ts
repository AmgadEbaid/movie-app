import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

// The @Global() decorator makes the provider available everywhere
// without needing to import StripeModule in every other module.
@Global()
@Module({
  providers: [
    {
      // This is the factory provider
      provide: 'STRIPE_CLIENT', // The token we will use to inject the client
      useFactory: (configService: ConfigService): Stripe => {
        // This function will be executed by NestJS to create the provider

        // 1. Get the secret key from the environment variables
        const apiKey = configService.get<string>('STRIPE_SECRET_KEY');
        const apiVersion = configService.get<string>('STRIPE_API_VERSION') as Stripe.LatestApiVersion;

        // 2. Create and return the new Stripe instance
        return new Stripe(apiKey!);
      },
      inject: [ConfigService], // We need ConfigService to get the API key
    },
  ],
  exports: ['STRIPE_CLIENT'], // Export the provider so other modules can use it
})
export class StripeModule {}