import { type INestApplication } from '@nestjs/common';
import pg from 'pg';

import { loadEnv } from '../src/config/env';

import { asDemoOwner, categoryBody, productBody } from './catalog-helpers';
import { createTestApp } from './create-test-app';
import { apiAgent } from './http';
import { SEED_ORG } from './factories';
import { createIsolatedBranch } from './ordering-helpers';

describe('catalog.updated outbox events (e2e)', () => {
  let app: INestApplication;
  let workerPool: pg.Pool;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    // app_user cannot read outbox_events; the worker role can.
    const url = loadEnv().DATABASE_WORKER_URL;
    if (!url) {
      throw new Error('DATABASE_WORKER_URL is required for this suite');
    }
    workerPool = new pg.Pool({ connectionString: url });
  });

  afterAll(async () => {
    await workerPool.end();
    await app.close();
  });

  async function catalogEventsFor(branchId: string) {
    const result = await workerPool.query<{ org_id: string; payload: unknown }>(
      `SELECT org_id, payload FROM outbox_events
       WHERE branch_id = $1::uuid AND type = 'catalog.updated'
       ORDER BY created_at, id`,
      [branchId],
    );
    return result.rows;
  }

  it('records one event per branch for each catalog mutation', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const before = (await catalogEventsFor(branchId)).length;

    const cat = await owner.post('/v1/categories').send(categoryBody());
    expect(cat.status).toBe(201);
    const categoryId = (cat.body as { id: string }).id;
    const product = await owner.post('/v1/products').send(productBody(categoryId));
    expect(product.status).toBe(201);

    const rows = await catalogEventsFor(branchId);
    expect(rows.length - before).toBe(2);
    const last = rows[rows.length - 1];
    expect(last?.org_id).toBe(SEED_ORG.demo.id);
    expect(last?.payload).toEqual({ branchId, version: expect.any(Number) as number });
  });

  it('does not record an event when the mutation fails', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const before = (await catalogEventsFor(branchId)).length;

    const res = await owner.post('/v1/products').send({ nope: true });
    expect(res.status).toBe(400);

    expect((await catalogEventsFor(branchId)).length).toBe(before);
  });
});
