import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // THIS IS THE KEY: Disable Nest's default parser
    bodyParser: false,
  }); 
    const rawBodyBuffer = (req, res, buffer) => {
    if (buffer && buffer.length) {
      req.rawBody = buffer;
    }
  };
  
  app.use(express.json({ verify: rawBodyBuffer }));
  app.use(express.urlencoded({ verify: rawBodyBuffer, extended: true }));
  app.useGlobalPipes(new ValidationPipe());

  await app.listen(3001);
}
bootstrap();
