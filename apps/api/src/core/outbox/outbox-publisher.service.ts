import { Inject, Injectable, Logger } from '@nestjs/common';

import { WORKER_DRIZZLE, type WorkerDrizzleDb } from '../db/worker-db.module';

import { EVENT_PUBLISHER, type EventPublisher } from './event-publisher';
import { OutboxRepository } from './outbox.repository';

function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

@Injectable()
export class OutboxPublisherService {
  private readonly logger = new Logger(OutboxPublisherService.name);

  constructor(
    @Inject(WORKER_DRIZZLE) private readonly workerDb: WorkerDrizzleDb,
    private readonly repo: OutboxRepository,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
  ) {}

  /** Processes one batch; safe to call concurrently (SKIP LOCKED). */
  async publishNextBatch(batchSize = 20): Promise<number> {
    let processed = 0;
    for (let i = 0; i < batchSize; i += 1) {
      const done = await this.workerDb.transaction(async (tx) => {
        const rows = await this.repo.lockNextUnpublished(tx, 1);
        const row = rows[0];
        if (!row) {
          return false;
        }
        try {
          await this.publisher.publish(row);
          await this.repo.markPublishedInTx(tx, row.id);
        } catch (err: unknown) {
          const message = errorMessage(err);
          this.logger.warn({ outboxId: row.id, err: message }, 'outbox publish failed');
          await this.repo.markFailedInTx(tx, row.id, message);
        }
        return true;
      });
      if (!done) {
        break;
      }
      processed += 1;
    }
    return processed;
  }
}
