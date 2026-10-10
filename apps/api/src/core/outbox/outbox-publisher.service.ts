import { Inject, Injectable, Logger } from '@nestjs/common';

import { WORKER_DRIZZLE, type WorkerDrizzleDb, type WorkerDrizzleTx } from '../db/worker-db.module';

import { shouldMarkOutboxDead } from './outbox-backoff';
import { EVENT_PUBLISHER, type EventPublisher } from './event-publisher';
import { OutboxRepository } from './outbox.repository';

function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

type ProcessOneResult =
  | { kind: 'empty' }
  | { kind: 'published' }
  | { kind: 'failed'; outboxId: string; message: string; dead: boolean };

@Injectable()
export class OutboxPublisherService {
  private readonly logger = new Logger(OutboxPublisherService.name);

  constructor(
    @Inject(WORKER_DRIZZLE) private readonly workerDb: WorkerDrizzleDb,
    private readonly repo: OutboxRepository,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
  ) {}

  /** Processes up to batchSize rows; stops the batch after the first failure. */
  async publishNextBatch(batchSize = 20): Promise<number> {
    let processed = 0;
    for (let i = 0; i < batchSize; i += 1) {
      const outcome = await this.workerDb.transaction(async (tx) => this.processOneLocked(tx));
      if (outcome.kind === 'empty') {
        break;
      }
      if (outcome.kind === 'failed') {
        if (outcome.dead) {
          this.logger.error(
            { outboxId: outcome.outboxId, err: outcome.message },
            'outbox event marked dead',
          );
        } else {
          this.logger.warn(
            { outboxId: outcome.outboxId, err: outcome.message },
            'outbox publish failed; backing off',
          );
        }
        break;
      }
      processed += 1;
    }
    return processed;
  }

  private async processOneLocked(tx: WorkerDrizzleTx): Promise<ProcessOneResult> {
    const rows = await this.repo.lockNextUnpublished(tx, 1);
    const row = rows[0];
    if (!row) {
      return { kind: 'empty' };
    }

    if (!row.branchId) {
      const message = 'Outbox event is missing branchId';
      await this.repo.markDeadInTx(tx, row.id, message, row.attempts);
      return { kind: 'failed', outboxId: row.id, message, dead: true };
    }

    try {
      await this.publisher.publish(row);
      await this.repo.markPublishedInTx(tx, row.id);
      return { kind: 'published' };
    } catch (err: unknown) {
      const message = errorMessage(err);
      const attemptsAfterFailure = row.attempts + 1;
      const dead = shouldMarkOutboxDead(attemptsAfterFailure, row.branchId);
      if (dead) {
        await this.repo.markDeadInTx(tx, row.id, message, attemptsAfterFailure);
      } else {
        await this.repo.markFailedInTx(tx, row.id, message, attemptsAfterFailure);
      }
      return { kind: 'failed', outboxId: row.id, message, dead };
    }
  }
}
