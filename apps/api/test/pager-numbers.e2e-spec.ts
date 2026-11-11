import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { newUuidV7 } from '../src/lib/uuid';

import { asDemoOwner } from './catalog-helpers';
import { createTestApp } from './create-test-app';
import { SEED_ORG } from './factories';
import { apiAgent } from './http';
import { createIsolatedBranch, postOrder, seedCatalogProduct } from './ordering-helpers';

describe('Pager numbers (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
  });

  afterAll(async () => {
    await app.close();
  });

  async function pagerBranch(owner: Agent, enable: boolean) {
    const { branchId } = await createIsolatedBranch(owner);
    const patched = await owner.patch(`/v1/branches/${branchId}`).send({ pagerEnabled: enable });
    expect(patched.status).toBe(200);
    const slug = (patched.body as { slug: string }).slug;
    return { branchId, slug };
  }

  function order(owner: Agent, branchId: string, productId: string, pagerNumber?: number) {
    const clientOrderId = newUuidV7();
    return postOrder(
      owner,
      branchId,
      {
        clientOrderId,
        type: 'takeaway',
        pagerNumber,
        items: [{ productId, quantity: 1, modifierIds: [] }],
      },
      clientOrderId,
    );
  }

  it('defaults to off and exposes the setting on the branch', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await createIsolatedBranch(owner);
    const list = await owner.get('/v1/branches');
    const branch = (list.body as { items: Array<{ id: string; pagerEnabled: boolean }> }).items.find(
      (b) => b.id === branchId,
    );
    expect(branch?.pagerEnabled).toBe(false);
  });

  it('rejects a pager number when the branch has it off', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await pagerBranch(owner, false);
    const { productId } = await seedCatalogProduct(agent);
    const res = await order(owner, branchId, productId, 12);
    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body)).toContain('PAGER_DISABLED');
  });

  it('stores the pager number and returns it on the order and the list', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await pagerBranch(owner, true);
    const { productId } = await seedCatalogProduct(agent);
    const created = await order(owner, branchId, productId, 42);
    expect(created.status).toBe(201);
    expect((created.body as { pagerNumber: number | null }).pagerNumber).toBe(42);

    const withoutPager = await order(owner, branchId, productId);
    expect((withoutPager.body as { pagerNumber: number | null }).pagerNumber).toBeNull();

    const list = await owner.get(`/v1/branches/${branchId}/orders`);
    const numbers = (list.body as { items: Array<{ pagerNumber: number | null }> }).items.map(
      (o) => o.pagerNumber,
    );
    expect(numbers).toEqual(expect.arrayContaining([42, null]));
  });

  it('rejects out-of-range pager numbers', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId } = await pagerBranch(owner, true);
    const { productId } = await seedCatalogProduct(agent);
    expect((await order(owner, branchId, productId, 0)).status).toBe(400);
    expect((await order(owner, branchId, productId, 10000)).status).toBe(400);
  });

  it('public display lists only ready orders, without login', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { branchId, slug } = await pagerBranch(owner, true);
    const { productId } = await seedCatalogProduct(agent);
    const placed = await order(owner, branchId, productId, 7);
    const ready = await order(owner, branchId, productId, 8);

    const move = async (id: string, to: string, version: number) =>
      owner
        .post(`/v1/branches/${branchId}/orders/${id}/status`)
        .send({ to, expectedVersion: version });
    const readyBody = ready.body as { id: string; version: number; orderNumber: number };
    const preparing = await move(readyBody.id, 'preparing', readyBody.version);
    expect(preparing.status).toBe(201);
    const done = await move(
      readyBody.id,
      'ready',
      (preparing.body as { version: number }).version,
    );
    expect(done.status).toBe(201);
    expect((placed.body as { status: string }).status).toBe('placed');

    const res = await apiAgent(app).get(`/v1/public/display/${SEED_ORG.demo.slug}/${slug}`);
    expect(res.status).toBe(200);
    const body = res.body as { ready: Array<{ orderNumber: number; pagerNumber: number | null }> };
    expect(body.ready).toEqual([{ orderNumber: readyBody.orderNumber, pagerNumber: 8 }]);
  });

  it('public display is 404 when the branch has pagers off', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const { slug } = await pagerBranch(owner, false);
    const res = await apiAgent(app).get(`/v1/public/display/${SEED_ORG.demo.slug}/${slug}`);
    expect(res.status).toBe(404);
  });
});
