import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { ENV, type Env } from '../config/config.module';
import { OutboxPublisherService } from '../core/outbox/outbox-publisher.service';

@Injectable()
export class OutboxPublisherJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherJob.name);
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly publisher: OutboxPublisherService,
  ) {}

  onModuleInit(): void {
    const ms = this.env.OUTBOX_PUBLISHER_INTERVAL_MS;
    this.timer = setInterval(() => {
      void this.tick();
    }, ms);
    this.logger.log(`Outbox publisher interval ${String(ms)}ms`);
  }

  onModuleDestroy(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async tick(): Promise<void> {
    try {
      await this.publisher.publishNextBatch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error({ err: message }, 'outbox publisher tick failed');
    }
  }
}
