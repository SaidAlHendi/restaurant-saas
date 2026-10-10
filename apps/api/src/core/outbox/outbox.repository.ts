import { Injectable } from '@nestjs/common';
import { asc, eq, isNull, sql } from 'drizzle-orm';

import { outboxEvents } from '../db/schema/infra';
import type { WorkerDrizzleTx } from '../db/worker-db.module';

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
  };
}

@Injectable()
export class OutboxRepository {
  async lockNextUnpublished(tx: WorkerDrizzleTx, limit: number): Promise<OutboxEventRow[]> {
    const rows = await tx
      .select()
      .from(outboxEvents)
      .where(isNull(outboxEvents.publishedAt))
      .orderBy(asc(outboxEvents.createdAt), asc(outboxEvents.id))
      .limit(limit)
      .for('update', { skipLocked: true });

    return rows.map(mapRow);
  }

  async markPublishedInTx(tx: WorkerDrizzleTx, id: string): Promise<void> {
    await tx
      .update(outboxEvents)
      .set({ publishedAt: new Date() })
      .where(eq(outboxEvents.id, id));
  }

  async markFailedInTx(tx: WorkerDrizzleTx, id: string, errorMessage: string): Promise<void> {
    await tx
      .update(outboxEvents)
      .set({
        attempts: sql`${outboxEvents.attempts} + 1`,
        lastError: errorMessage.slice(0, 2000),
      })
      .where(eq(outboxEvents.id, id));
  }
}
