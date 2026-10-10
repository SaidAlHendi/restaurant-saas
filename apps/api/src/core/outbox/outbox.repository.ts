import { Injectable } from '@nestjs/common';
import { and, asc, eq, isNull, lte, or } from 'drizzle-orm';

import { outboxEvents } from '../db/schema/infra';
import type { WorkerDrizzleTx } from '../db/worker-db.module';

import { computeNextAttemptAt } from './outbox-backoff';
import type { OutboxEventRow } from './event-publisher';

function mapRow(row: typeof outboxEvents.$inferSelect): OutboxEventRow {
  return {
    id: row.id,
    orgId: row.orgId,
    branchId: row.branchId,
    type: row.type,
    aggregateId: row.aggregateId,
    payload: row.payload as Record<string, unknown>,
    createdAt: row.createdAt,
    attempts: row.attempts,
  };
}

@Injectable()
export class OutboxRepository {
  async lockNextUnpublished(tx: WorkerDrizzleTx, limit: number): Promise<OutboxEventRow[]> {
    const now = new Date();
    const rows = await tx
      .select()
      .from(outboxEvents)
      .where(
        and(
          isNull(outboxEvents.publishedAt),
          or(isNull(outboxEvents.nextAttemptAt), lte(outboxEvents.nextAttemptAt, now)),
        ),
      )
      .orderBy(asc(outboxEvents.createdAt), asc(outboxEvents.id))
      .limit(limit)
      .for('update', { skipLocked: true });

    return rows.map(mapRow);
  }

  async markPublishedInTx(tx: WorkerDrizzleTx, id: string): Promise<void> {
    await tx
      .update(outboxEvents)
      .set({ publishedAt: new Date(), nextAttemptAt: null })
      .where(eq(outboxEvents.id, id));
  }

  async markFailedInTx(
    tx: WorkerDrizzleTx,
    id: string,
    errorMessage: string,
    attemptsAfterFailure: number,
  ): Promise<void> {
    const now = new Date();
    await tx
      .update(outboxEvents)
      .set({
        attempts: attemptsAfterFailure,
        lastError: errorMessage.slice(0, 2000),
        nextAttemptAt: computeNextAttemptAt(now, attemptsAfterFailure),
      })
      .where(eq(outboxEvents.id, id));
  }

  async markDeadInTx(
    tx: WorkerDrizzleTx,
    id: string,
    errorMessage: string,
    attempts: number,
  ): Promise<void> {
    await tx
      .update(outboxEvents)
      .set({
        publishedAt: new Date(),
        lastError: errorMessage.slice(0, 2000),
        nextAttemptAt: null,
        attempts,
      })
      .where(eq(outboxEvents.id, id));
  }
}
