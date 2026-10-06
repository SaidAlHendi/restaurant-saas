import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { WorkerModule } from './worker.module';

let workerContext: Awaited<ReturnType<typeof NestFactory.createApplicationContext>> | undefined;

export async function startWorkerContext(): Promise<void> {
  if (workerContext) {
    return;
  }
  workerContext = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  workerContext.useLogger(workerContext.get(Logger));
}

export async function stopWorkerContext(): Promise<void> {
  if (workerContext) {
    await workerContext.close();
    workerContext = undefined;
  }
}
