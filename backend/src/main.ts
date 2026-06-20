import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { kafkaConsumerConfig } from './common/config/kafka.config';

if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error("FATAL ERROR: JWT_ACCESS_SECRET or JWT_REFRESH_SECRET is missing!");
  process.exit(1);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  (app.getHttpAdapter().getInstance() as any).set('trust proxy', true);

  app.connectMicroservice(kafkaConsumerConfig);

  await app.startAllMicroservices();

  app.use(cookieParser());

  app.setGlobalPrefix('api');

  const isProd = process.env.NODE_ENV === 'production';

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginEmbedderPolicy: isProd,
    })
  );

  const rawOrigins = process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:5173';
  const origins = rawOrigins.split(',').map(o => o.trim());

  const isDev = process.env.NODE_ENV !== 'production';

  app.enableCors({
    origin: isDev ? (origin, callback) => {
      if (!origin || origin.includes('localhost') || origin.includes('ngrok-free.dev') || origin.includes('ngrok-free.app')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } : origins,
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'x-client-type',
      'Access-Control-Allow-Headers',
      'ngrok-skip-browser-warning',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.enableShutdownHooks();

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
}

bootstrap();