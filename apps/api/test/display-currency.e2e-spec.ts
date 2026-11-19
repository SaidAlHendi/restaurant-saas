import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import type { DailyReport, OrderDetail, OrgSettingsResponse, Payment } from '@app/shared';

import { newUuidV7 } from '../src/lib/uuid';

import { asDemoOwner } from './catalog-helpers';
import { createTestApp } from './create-test-app';
import { SEED_ORG } from './factories';
import { apiAgent } from './http';
import { createIsolatedBranch, postOrder, seedCatalogProduct } from './ordering-helpers';

/** Demo org base currency is SAR (2 decimals); SYP has none. */

describe('Display currency (e2e)', () => {
  let app: INestApplication;
  let owner: Agent;
  let branchId = '';
  let productId = '';
  let totalMinor = 0;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    owner = await asDemoOwner(apiAgent(app));
    // Own branch, so the daily report only sees this suite's orders.
    ({ branchId } = await createIsolatedBranch(owner));
    ({ productId } = await seedCatalogProduct(apiAgent(app)));
  });

  afterAll(async () => {
    // Other suites share the demo org: leave it showing its base currency.
    await owner.patch('/v1/org/settings').send({ displayCurrency: null });
    await app.close();
  });

  function patchSettings(body: Record<string, unknown>) {
    return owner.patch('/v1/org/settings').send(body);
  }

  async function placeOrder(): Promise<OrderDetail> {
    const clientOrderId = newUuidV7();
    const res = await postOrder(
      owner,
      branchId,
      {
        clientOrderId,
        type: 'takeaway',
        customerName: `Fx-${clientOrderId.slice(-6)}`,
        items: [{ productId, quantity: 1, modifierIds: [] }],
      },
      clientOrderId,
    );
    expect(res.status).toBe(201);
    return res.body as OrderDetail;
  }

  async function getOrder(orderId: string): Promise<OrderDetail> {
    const res = await owner.get(`/v1/branches/${branchId}/orders/${orderId}`);
    expect(res.status).toBe(200);
    return res.body as OrderDetail;
  }

  it('is off by default: orders and menus carry no display currency', async () => {
    const settings = (await owner.get('/v1/org/settings')).body as OrgSettingsResponse;
    expect(settings.displayCurrency).toBeNull();
    expect(settings.exchangeRate).toBeNull();

    const order = await placeOrder();
    totalMinor = order.totalMinor;
    expect(order.display).toBeNull();

    const menu = await owner.get(`/v1/branches/${branchId}/pos/menu`);
    expect((menu.body as { display: unknown }).display).toBeNull();
  });

  it('needs an exchange rate to switch to another currency', async () => {
    const res = await patchSettings({ displayCurrency: 'SYP' });
    expect(res.status).toBe(400);
    expect((res.body as { error: { code: string } }).error.code).toBe('EXCHANGE_RATE_REQUIRED');
  });

  it('rejects unknown currencies and rounding steps', async () => {
    expect((await patchSettings({ displayCurrency: 'ZZZ', exchangeRate: 2 })).status).toBe(400);
    expect(
      (await patchSettings({ displayCurrency: 'SYP', exchangeRate: 3500, displayItemStep: 7 }))
        .status,
    ).toBe(400);
    expect((await patchSettings({ displayCurrency: 'SYP', exchangeRate: 0 })).status).toBe(400);
  });

  it('saves the display currency and shows it on the POS and public menus', async () => {
    const res = await patchSettings({ displayCurrency: 'SYP', exchangeRate: 3500 });
    expect(res.status).toBe(200);
    const settings = res.body as OrgSettingsResponse;
    expect(settings).toMatchObject({
      defaultCurrency: 'SAR',
      displayCurrency: 'SYP',
      exchangeRate: 3500,
      displayItemStep: 100,
      displayTotalStep: 500,
    });
    expect(settings.exchangeRateUpdatedAt).not.toBeNull();

    const expected = { currency: 'SYP', rate: 3500, itemStep: 100, totalStep: 500 };
    const posMenu = await owner.get(`/v1/branches/${branchId}/pos/menu`);
    expect(posMenu.status).toBe(200);
    expect((posMenu.body as { display: unknown }).display).toEqual(expected);
    expect((posMenu.body as { branch: { currency: string } }).branch.currency).toBe('SAR');

    const publicMenu = await apiAgent(app).get(`/v1/public/menus/${SEED_ORG.demo.slug}`);
    expect(publicMenu.status).toBe(200);
    const org = (publicMenu.body as { org: { currency: string; display: unknown } }).org;
    expect(org.currency).toBe('SAR');
    expect(org.display).toEqual(expected);
  });

  it('keeps the rate timestamp when unrelated settings are saved', async () => {
    const before = (await owner.get('/v1/org/settings')).body as OrgSettingsResponse;
    const res = await patchSettings({ name: before.name });
    expect(res.status).toBe(200);
    expect((res.body as OrgSettingsResponse).exchangeRateUpdatedAt).toBe(
      before.exchangeRateUpdatedAt,
    );
  });

  it('freezes the rate on each order: a later rate change does not touch it', async () => {
    const first = await placeOrder();
    expect(first.currency).toBe('SAR');
    expect(first.totalMinor).toBe(totalMinor);
    expect(first.display).toEqual({ currency: 'SYP', rate: 3500, itemStep: 100, totalStep: 500 });

    const changed = await patchSettings({ exchangeRate: 4000, displayTotalStep: 1000 });
    expect(changed.status).toBe(200);

    expect((await getOrder(first.id)).display).toEqual(first.display);

    const second = await placeOrder();
    expect(second.display).toEqual({ currency: 'SYP', rate: 4000, itemStep: 100, totalStep: 1000 });
  });

  it('takes cash in the display currency and stores exact tendered and change', async () => {
    // Rate is 4000 with totals rounded to 1000 here.
    const order = await placeOrder();
    const dueDisplay = Math.round((order.totalMinor / 100) * 4000 / 1000) * 1000;

    const pay = (displayTenderedMinor: number) => {
      const clientPaymentId = newUuidV7();
      return owner
        .post(`/v1/branches/${branchId}/orders/${order.id}/payments`)
        .set('Idempotency-Key', clientPaymentId)
        .send({
          clientPaymentId,
          expectedVersion: order.version,
          method: 'cash',
          amountMinor: order.totalMinor,
          displayTenderedMinor,
        });
    };

    const short = await pay(dueDisplay - 1000);
    expect(short.status).toBe(422);
    expect((short.body as { error: { code: string } }).error.code).toBe(
      'PAYMENT_TENDERED_INSUFFICIENT',
    );

    const paid = await pay(dueDisplay + 5000);
    expect(paid.status).toBe(201);
    const payment = paid.body as Payment;
    expect(payment.amountMinor).toBe(order.totalMinor);
    expect(payment.displayTenderedMinor).toBe(dueDisplay + 5000);
    expect(payment.displayChangeMinor).toBe(5000);
    expect(payment.tenderedMinor).toBeGreaterThanOrEqual(order.totalMinor);

    const after = await getOrder(order.id);
    expect(after.paymentStatus).toBe('paid');
    expect(after.payments[0]?.displayChangeMinor).toBe(5000);
  });

  it('reports in the display currency, each order at its own frozen rate', async () => {
    const res = await owner.get(`/v1/branches/${branchId}/reports/daily`);
    expect(res.status).toBe(200);
    const report = res.body as DailyReport;
    expect(report.currency).toBe('SYP');
    expect(report.display).toEqual({ currency: 'SYP', rate: 4000, itemStep: 100, totalStep: 1000 });
    expect(report.ordersCount).toBe(4);

    const major = totalMinor / 100;
    const round = (value: number, step: number) => Math.round(value / step) * step;
    const expectedSales =
      // made before the display currency existed: today's rate and rounding
      round(major * 4000, 1000) +
      // frozen at 3500, totals rounded to 500
      round(major * 3500, 500) +
      // two orders frozen at 4000, totals rounded to 1000
      2 * round(major * 4000, 1000);
    expect(report.salesMinor).toBe(expectedSales);
    expect(report.paidMinor).toBe(round(major * 4000, 1000));
    const cash = report.byPaymentMethod.find((row) => row.method === 'cash');
    expect(cash?.amountMinor).toBe(round(major * 4000, 1000));
  });

  it('switches off again: new orders have no display currency, old ones keep theirs', async () => {
    const frozen = await placeOrder();
    const off = await patchSettings({ displayCurrency: null });
    expect(off.status).toBe(200);
    expect(off.body as OrgSettingsResponse).toMatchObject({
      displayCurrency: null,
      exchangeRate: null,
      exchangeRateUpdatedAt: null,
    });

    expect((await placeOrder()).display).toBeNull();
    expect((await getOrder(frozen.id)).display?.rate).toBe(4000);

    const report = (await owner.get(`/v1/branches/${branchId}/reports/daily`)).body as DailyReport;
    expect(report.currency).toBe('SAR');
    expect(report.display).toBeNull();
    expect(report.salesMinor).toBe(6 * totalMinor);
  });

  it('treats the base currency as "off" and refuses a rate without a display currency', async () => {
    const same = await patchSettings({ displayCurrency: 'SAR' });
    expect(same.status).toBe(200);
    expect((same.body as OrgSettingsResponse).displayCurrency).toBeNull();

    expect((await patchSettings({ exchangeRate: 3500 })).status).toBe(400);
  });
});
