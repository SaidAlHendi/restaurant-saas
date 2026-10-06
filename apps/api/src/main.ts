import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { loadEnv } from './config/env';
import { startWorkerContext } from './worker.bootstrap';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  if (env.APP_ROLE === 'worker' || env.APP_ROLE === 'all') {
    await startWorkerContext();
  }

  await app.listen(env.PORT);
}

void bootstrap();
