import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { loadEnv } from './config/env';
import { SocketIoRedisIoAdapter } from './core/realtime/socket-io-redis.adapter';
import { startWorkerContext } from './worker.bootstrap';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { rawBody: true, bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(cookieParser());
  app.enableCors({
    origin: env.CORS_ORIGINS?.split(',').map((s) => s.trim()) ?? true,
    credentials: true,
  });
  app.enableShutdownHooks();

  const redisAdapter = new SocketIoRedisIoAdapter(app);
  redisAdapter.connectToRedis();
  app.useWebSocketAdapter(redisAdapter);

  if (env.APP_ROLE === 'worker' || env.APP_ROLE === 'all') {
    await startWorkerContext();
  }

  await app.listen(env.PORT);
}

void bootstrap();
