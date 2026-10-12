import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as compression from 'compression';
import helmet from 'helmet';
import { json, urlencoded } from 'express';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();

  // Use Pino logger
  app.useLogger(app.get(Logger));

  // Configure WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  const configService = app.get(ConfigService);

  // Configure body parser with increased size limits for file uploads
  const requestSizeLimit = '20mb';
  app.use(json({ limit: requestSizeLimit }));
  app.use(urlencoded({ limit: requestSizeLimit, extended: true }));

  // Security & Performance
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: configService.get('NODE_ENV') === 'production'
      ? [configService.getOrThrow<string>('FRONTEND_URL')]
      : [
      configService.get<string>('FRONTEND_URL') || 'http://localhost:3000',
      'http://localhost:3002',
      'https://sellerpotal-elsl.onrender.com', // Production frontend
      'https://sellers-potal.vercel.app', // Vercel deployment
      /\.vercel\.app$/, // Allow all Vercel preview deployments
      'null', // Allow file:// protocol for testing
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 3600, // Cache preflight requests for 1 hour
  });

  // Global pipes and filters
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  // app.useGlobalFilters(
  //   new HttpExceptionFilter(),
  //   new PrismaExceptionFilter(),
  // );

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Furniture Marketplace API')
    .setDescription('API for furniture marketplace with referral system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port, '0.0.0.0');

  const logger = app.get(Logger);
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}
void bootstrap();
