import { type INestApplication } from '@nestjs/common';

import type { OrgSettingsResponse } from '@app/shared';

import { JwtAccessService } from '../src/core/auth/jwt.service';
import { newUuidV7 } from '../src/lib/uuid';

import { categoryBody, productBody } from './catalog-helpers';
import { createTestApp } from './create-test-app';
import { postOrder } from './ordering-helpers';
import { signupFreshOrg, type FreshOrg } from './staff-settings-helpers';

type ApiError = { error: { code?: string } };
type BranchRow = { id: string; currency: string };

/** A fresh restaurant signs up with SAR as its base currency and has no orders. */
describe('Base currency (e2e)', () => {
  let app: INestApplication;
  let fresh: FreshOrg;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    fresh = await signupFreshOrg(app, app.get(JwtAccessService));
  });

  afterAll(async () => {
    await app.close();
  });

  async function settings(): Promise<OrgSettingsResponse> {
    const res = await fresh.ownerAgent.get('/v1/org/settings');
    expect(res.status).toBe(200);
    return res.body as OrgSettingsResponse;
  }

  async function branchCurrency(): Promise<string> {
    const res = await fresh.ownerAgent.get('/v1/branches');
    expect(res.status).toBe(200);
    const list = res.body as BranchRow[] | { items: BranchRow[] };
    const rows = Array.isArray(list) ? list : list.items;
    return rows.find((row) => row.id === fresh.branchId)?.currency ?? '';
  }

  it('is unlocked while the restaurant has no orders', async () => {
    const current = await settings();
    expect(current.defaultCurrency).toBe('SAR');
    expect(current.baseCurrencyLocked).toBe(false);
  });

  it('rejects an unknown currency code', async () => {
    const res = await fresh.ownerAgent.patch('/v1/org/settings').send({ defaultCurrency: 'XXQ' });
    expect(res.status).toBe(400);
  });

  it('changes the base currency and moves every branch with it', async () => {
    const res = await fresh.ownerAgent.patch('/v1/org/settings').send({ defaultCurrency: 'USD' });
    expect(res.status).toBe(200);
    expect((res.body as OrgSettingsResponse).defaultCurrency).toBe('USD');
    expect(await branchCurrency()).toBe('USD');
  });

  it('drops the display currency when the base currency changes', async () => {
    const on = await fresh.ownerAgent
      .patch('/v1/org/settings')
      .send({ displayCurrency: 'SYP', exchangeRate: 13000 });
    expect(on.status).toBe(200);
    expect((on.body as OrgSettingsResponse).displayItemStep).toBe(100);

    const res = await fresh.ownerAgent.patch('/v1/org/settings').send({ defaultCurrency: 'SAR' });
    expect(res.status).toBe(200);
    const body = res.body as OrgSettingsResponse;
    expect(body.defaultCurrency).toBe('SAR');
    expect(body.displayCurrency).toBeNull();
    expect(body.exchangeRate).toBeNull();
  });

  it('can change base and display currency in one save, with a new rate', async () => {
    const res = await fresh.ownerAgent
      .patch('/v1/org/settings')
      .send({ defaultCurrency: 'USD', displayCurrency: 'SAR', exchangeRate: 3.75 });
    expect(res.status).toBe(200);
    const body = res.body as OrgSettingsResponse;
    expect(body.defaultCurrency).toBe('USD');
    expect(body.displayCurrency).toBe('SAR');
    // SAR prices are small numbers: no rounding unless the owner asks for it.
    expect(body.displayItemStep).toBe(0);
    expect(body.displayTotalStep).toBe(0);

    const missingRate = await fresh.ownerAgent
      .patch('/v1/org/settings')
      .send({ defaultCurrency: 'EUR', displayCurrency: 'SAR' });
    expect(missingRate.status).toBe(400);
  });

  it('locks the base currency after the first order', async () => {
    // The catalog helpers write Arabic and English names.
    const locales = await fresh.ownerAgent.patch('/v1/org/settings').send({ locales: ['en', 'ar'] });
    expect(locales.status).toBe(200);
    const category = await fresh.ownerAgent.post('/v1/categories').send(categoryBody());
    expect(category.status).toBe(201);
    const product = await fresh.ownerAgent
      .post('/v1/products')
      .send(productBody((category.body as { id: string }).id, 2500));
    expect(product.status).toBe(201);
    const productId = (product.body as { id: string }).id;
    const clientOrderId = newUuidV7();
    const order = await postOrder(
      fresh.ownerAgent,
      fresh.branchId,
      {
        clientOrderId,
        type: 'takeaway',
        customerName: 'First guest',
        items: [{ productId, quantity: 1, modifierIds: [] }],
      },
      clientOrderId,
    );
    expect(order.status).toBe(201);

    expect((await settings()).baseCurrencyLocked).toBe(true);

    const res = await fresh.ownerAgent.patch('/v1/org/settings').send({ defaultCurrency: 'EUR' });
    expect(res.status).toBe(409);
    expect((res.body as ApiError).error.code).toBe('BASE_CURRENCY_LOCKED');

    // Sending the current base currency is not a change.
    const same = await fresh.ownerAgent.patch('/v1/org/settings').send({ defaultCurrency: 'USD' });
    expect(same.status).toBe(200);
  });
});
