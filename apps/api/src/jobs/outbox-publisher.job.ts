import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { ENV, type Env } from '../config/config.module';
import { OutboxPublisherService } from '../core/outbox/outbox-publisher.service';

@Injectable()
export class OutboxPublisherJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherJob.name);
  private timeout: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private tickInFlight = false;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly publisher: OutboxPublisherService,
  ) {}

  onModuleInit(): void {
    this.scheduleNextTick(0);
    this.logger.log(`Outbox publisher interval ${String(this.env.OUTBOX_PUBLISHER_INTERVAL_MS)}ms`);
  }

  onModuleDestroy(): void {
    this.stopped = true;
    if (this.timeout !== undefined) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
  }

  scheduleNextTick(delayMs: number): void {
    if (this.stopped) {
      return;
    }
    this.timeout = setTimeout(() => {
      void this.runTick();
    }, delayMs);
  }

  async runTick(): Promise<void> {
    if (this.stopped || this.tickInFlight) {
      return;
    }
    this.tickInFlight = true;
    try {
      await this.tick();
    } finally {
      this.tickInFlight = false;
      this.scheduleNextTick(this.env.OUTBOX_PUBLISHER_INTERVAL_MS);
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
