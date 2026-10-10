import { eq, sql } from 'drizzle-orm';
import { Test, type TestingModule } from '@nestjs/testing';

import { ConfigModule } from '../src/config/config.module';
import { resetEnvCacheForTests } from '../src/config/env';
import { outboxEvents } from '../src/core/db/schema/infra';
import { DbModule, DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { WORKER_DRIZZLE, type WorkerDrizzleDb } from '../src/core/db/worker-db.module';
import { withOrg } from '../src/core/db/with-org';
import {
  EVENT_PUBLISHER,
  type EventPublisher,
  type OutboxEventRow,
} from '../src/core/outbox/event-publisher';
import { OutboxPublisherModule } from '../src/core/outbox/outbox-publisher.module';
import { OutboxPublisherService } from '../src/core/outbox/outbox-publisher.service';
import { newUuidV7 } from '../src/lib/uuid';

import { SEED_ORG } from './factories';

class RecordingEventPublisher implements EventPublisher {
  readonly published: OutboxEventRow[] = [];
  failOnId: string | undefined;
  failMessage = 'publish failed';

  publish(event: OutboxEventRow): Promise<void> {
    if (this.failOnId === event.id) {
      return Promise.reject(new Error(this.failMessage));
    }
    this.published.push(event);
    return Promise.resolve();
  }
}

async function insertOutboxRow(
  db: DrizzleDb,
  input: { id?: string; branchId: string; createdAt?: Date },
): Promise<string> {
  const id = input.id ?? newUuidV7();
  await withOrg(db, SEED_ORG.demo.id, async (tx) => {
    await tx.insert(outboxEvents).values({
      id,
      orgId: SEED_ORG.demo.id,
      branchId: input.branchId,
      type: 'order.updated',
      aggregateId: newUuidV7(),
      payload: { orderId: newUuidV7(), branchId: input.branchId, status: 'placed', version: 1 },
      createdAt: input.createdAt,
    });
  });
  return id;
}

describe('Outbox publisher (e2e)', () => {
  let moduleRef: TestingModule;
  let db: DrizzleDb;
  let workerDb: WorkerDrizzleDb;
  let publisher: OutboxPublisherService;
  let recording: RecordingEventPublisher;
  let branchId = '';

  beforeAll(async () => {
    resetEnvCacheForTests();
    recording = new RecordingEventPublisher();
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule, DbModule, OutboxPublisherModule],
    })
      .overrideProvider(EVENT_PUBLISHER)
      .useValue(recording)
      .compile();

    db = moduleRef.get(DRIZZLE);
    workerDb = moduleRef.get(WORKER_DRIZZLE);
    publisher = moduleRef.get(OutboxPublisherService);

    await withOrg(db, SEED_ORG.demo.id, async (tx) => {
      const row = await tx.execute(sql`
        SELECT id FROM branches WHERE org_id = ${SEED_ORG.demo.id}::uuid AND is_active = true LIMIT 1
      `);
      branchId = (row.rows[0] as { id: string } | undefined)?.id ?? '';
    });
    if (!branchId) {
      throw new Error('missing demo branch');
    }
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    recording.published.length = 0;
    recording.failOnId = undefined;
    await workerDb.execute(sql`
      UPDATE outbox_events SET published_at = now()
      WHERE org_id = ${SEED_ORG.demo.id}::uuid AND published_at IS NULL
    `);
  });

  it('publishes unpublished rows in created_at order', async () => {
    const id1 = await insertOutboxRow(db, {
      branchId,
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
    });
    const id2 = await insertOutboxRow(db, {
      branchId,
      createdAt: new Date('2026-01-01T11:00:00.000Z'),
    });
    const id3 = await insertOutboxRow(db, {
      branchId,
      createdAt: new Date('2026-01-01T12:00:00.000Z'),
    });

    await publisher.publishNextBatch(10);

    expect(recording.published.map((r) => r.id)).toEqual([id1, id2, id3]);
  });

  it('increments attempts and stores last_error when publish fails', async () => {
    const id = await insertOutboxRow(db, { branchId });
    recording.failOnId = id;
    recording.failMessage = 'redis down';

    await publisher.publishNextBatch(1);

    const rows = await workerDb.select().from(outboxEvents).where(eq(outboxEvents.id, id)).limit(1);
    const row = rows[0];
    expect(row?.publishedAt).toBeNull();
    expect(row?.attempts).toBe(1);
    expect(row?.lastError).toBe('redis down');
  });

  it('never publishes the same row twice when two publishers run concurrently', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      ids.push(await insertOutboxRow(db, { branchId }));
    }

    const secondPublisher = moduleRef.get(OutboxPublisherService);
    await Promise.all([
      publisher.publishNextBatch(20),
      secondPublisher.publishNextBatch(20),
    ]);

    const publishedIds = recording.published.map((r) => r.id);
    expect(publishedIds).toHaveLength(12);
    expect(new Set(publishedIds).size).toBe(12);
    expect(new Set(publishedIds)).toEqual(new Set(ids));
  });
});
