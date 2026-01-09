import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global prefix para todas las rutas
  app.setGlobalPrefix('api');

  // Enable validation pipe with transformation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: true,
      forbidNonWhitelisted: false, // Permite campos extra pero los ignora
      skipMissingProperties: false,
      errorHttpStatusCode: 400,
    }),
  );

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
  console.log('Backend running on http://localhost:3000');
}
bootstrap();
