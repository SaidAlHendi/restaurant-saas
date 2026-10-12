import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { ENV, type Env } from '../config/config.module';
import { OutboxPublisherService } from '../core/outbox/outbox-publisher.service';

@Injectable()
export class OutboxPublisherJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherJob.name);
  private timeout: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private inFlightTick: Promise<void> | undefined;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly publisher: OutboxPublisherService,
  ) {}

  onModuleInit(): void {
    this.scheduleNextTick(0);
    this.logger.log(`Outbox publisher interval ${String(this.env.OUTBOX_PUBLISHER_INTERVAL_MS)}ms`);
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    if (this.timeout !== undefined) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
    const tick = this.inFlightTick;
    if (!tick) {
      return;
    }
    const capMs = this.env.OUTBOX_SHUTDOWN_TIMEOUT_MS;
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        this.logger.warn(
          `Outbox publisher shutdown timed out after ${String(capMs)}ms with a tick still in flight`,
        );
        resolve();
      }, capMs);
      void tick.finally(() => {
        clearTimeout(timeout);
        resolve();
      });
    });
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
    if (this.stopped || this.inFlightTick) {
      return;
    }
    this.inFlightTick = this.executeTick();
    try {
      await this.inFlightTick;
    } finally {
      this.inFlightTick = undefined;
      this.scheduleNextTick(this.env.OUTBOX_PUBLISHER_INTERVAL_MS);
    }
  }

  private async executeTick(): Promise<void> {
    try {
      await this.publisher.publishNextBatch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error({ err: message }, 'outbox publisher tick failed');
    }
  }
}
