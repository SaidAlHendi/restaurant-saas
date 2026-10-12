import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';

import { ENV, type Env } from './config/config.module';
import { stopWorkerContext } from './worker.bootstrap';

@Injectable()
export class WorkerContextShutdownService implements OnApplicationShutdown {
  constructor(@Inject(ENV) private readonly env: Env) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.env.APP_ROLE === 'worker' || this.env.APP_ROLE === 'all') {
      await stopWorkerContext();
    }
  }
}
