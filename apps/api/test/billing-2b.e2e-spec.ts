import { sql } from 'drizzle-orm';
import type { Agent } from 'supertest';

import { PLAN_IDS, type MeResponse } from '@app/shared';

import { JwtAccessService } from '../src/core/auth/jwt.service';
import { CLOCK } from '../src/core/clock/clock.tokens';
import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { withOrg } from '../src/core/db/with-org';
import { newUuidV7 } from '../src/lib/uuid';
import { BillingRepository } from '../src/modules/billing/billing.repository';
import { FakePaddleClient } from './fake-paddle-client';
import { PADDLE_CLIENT } from '../src/modules/billing/paddle.tokens';
import { SubscriptionService } from '../src/modules/billing/subscription.service';

import {
  paddleEnvEnabled,
  priceIdForTestPlan,
  signPaddleBody,
  subscriptionEventPayload,
  TEST_PADDLE_SECRET,
  TEST_PRICE_RESTAURANT,
} from './billing-paddle-helpers';
import { apiAgent, withBearer } from './http';
import { createIsolatedBranch } from './ordering-helpers';
import { extractInviteToken, signupFreshOrg } from './staff-settings-helpers';

type ApiErrorBody = {
  error: { code: string; message: string; details: Record<string, unknown> };
};

const DEFAULT_WEBHOOK_TS = Math.floor(Date.parse('2026-06-15T12:00:00.000Z') / 1000);

async function postWebhook(
  agent: Agent,
  payload: Record<string, unknown>,
  opts?: { secret?: string; tsSeconds?: number; signature?: string | null },
) {
  const raw = JSON.stringify(payload);
  const ts = opts?.tsSeconds ?? DEFAULT_WEBHOOK_TS;
  const secret = opts?.secret ?? TEST_PADDLE_SECRET;
  const req = agent
    .post('/v1/billing/webhooks/paddle')
    .set('Content-Type', 'application/json');
  if (opts?.signature === null) {
    return req.send(raw);
  }
  const signature = opts?.signature ?? signPaddleBody(raw, secret, ts);
  return req.set('Paddle-Signature', signature).send(raw);
}

describe('Billing 2b Paddle (e2e)', () => {
  let clockNowMs = Date.parse('2026-06-15T12:00:00.000Z');

  beforeEach(() => {
    clockNowMs = Date.parse('2026-06-15T12:00:00.000Z');
  });

  async function createAppWithFakePaddle(
    env: Record<string, string | undefined> = { ...paddleEnvEnabled },
  ) {
    const { resetEnvCacheForTests, loadEnv } = await import('../src/config/env');
    resetEnvCacheForTests();
    loadEnv(env);
    const { Test } = await import('@nestjs/testing');
    const { AppModule } = await import('../src/app.module');
    const cookieParser = (await import('cookie-parser')).default;
    const fake = new FakePaddleClient();
    const clock = { now: () => new Date(clockNowMs) };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CLOCK)
      .useValue(clock)
      .overrideProvider(PADDLE_CLIENT)
      .useValue(fake)
      .compile();
    const nestApp = moduleRef.createNestApplication({ rawBody: true });
    nestApp.use(cookieParser());
    await nestApp.init();
    return { nestApp, fake, jwt: nestApp.get(JwtAccessService) };
  }

  it('webhook subscription.created activates mapped plan; /me reflects it', async () => {
    const { nestApp, jwt } = await createAppWithFakePaddle();
    try {
      const fresh = await signupFreshOrg(nestApp, jwt);
      const eventId = `evt-${newUuidV7()}`;
      const subId = `sub_${newUuidV7().slice(-12)}`;
      const periodEnd = '2026-07-15T12:00:00.000Z';
      const payload = subscriptionEventPayload({
        eventId,
        eventType: 'subscription.created',
        occurredAt: '2026-06-15T12:00:00.000Z',
        orgId: fresh.orgId,
        subscriptionId: subId,
        status: 'active',
        priceId: TEST_PRICE_RESTAURANT,
        currentPeriodEnd: periodEnd,
      });
      const res = await postWebhook(apiAgent(nestApp), payload);
      expect(res.status).toBe(200);

      const me = await fresh.ownerAgent.get('/v1/me');
      expect(me.status).toBe(200);
      const body = me.body as MeResponse;
      expect(body.entitlements.planKey).toBe('restaurant');
      expect(body.entitlements.reason).toBe('paid');
      expect(body.entitlements.status).toBe('active');
      expect(body.entitlements.currentPeriodEnd).toBe(periodEnd);

      const db: DrizzleDb = nestApp.get(DRIZZLE);
      await withOrg(db, fresh.orgId, async (tx) => {
        const row = await nestApp.get(BillingRepository).findSubscriptionWithPlan(tx, fresh.orgId);
        expect(row?.provider).toBe('paddle');
        expect(row?.providerSubscriptionId).toBe(subId);
        expect(row?.providerCustomerId).toBe('ctm_test_1');
      });
    } finally {
      await nestApp.close();
    }
  });

  it('same event id twice: 200 both times, one billing_events row', async () => {
    const { nestApp, jwt } = await createAppWithFakePaddle();
    try {
      const fresh = await signupFreshOrg(nestApp, jwt);
      const eventId = `evt-${newUuidV7()}`;
      const payload = subscriptionEventPayload({
        eventId,
        eventType: 'subscription.created',
        occurredAt: '2026-06-15T12:00:00.000Z',
        orgId: fresh.orgId,
        subscriptionId: `sub_${newUuidV7().slice(-12)}`,
        status: 'active',
        priceId: TEST_PRICE_RESTAURANT,
        currentPeriodEnd: '2026-07-15T12:00:00.000Z',
      });
      const a = await postWebhook(apiAgent(nestApp), payload);
      const b = await postWebhook(apiAgent(nestApp), payload);
      expect(a.status).toBe(200);
      expect(b.status).toBe(200);

      const db: DrizzleDb = nestApp.get(DRIZZLE);
      const count = await db.execute(
        sql`SELECT count(*)::int AS c FROM billing_events WHERE provider_event_id = ${eventId}`,
      );
      expect((count.rows[0] as { c: number }).c).toBe(1);
    } finally {
      await nestApp.close();
    }
  });

  it('bad signature, missing header, and old timestamp return 401 with no billing_events row', async () => {
    const { nestApp, jwt } = await createAppWithFakePaddle();
    try {
      const fresh = await signupFreshOrg(nestApp, jwt);
      const eventId = `evt-${newUuidV7()}`;
      const payload = subscriptionEventPayload({
        eventId,
        eventType: 'subscription.created',
        occurredAt: '2026-06-15T12:00:00.000Z',
        orgId: fresh.orgId,
        subscriptionId: `sub_${newUuidV7().slice(-12)}`,
        status: 'active',
        priceId: TEST_PRICE_RESTAURANT,
      });

      const bad = await postWebhook(apiAgent(nestApp), payload, {
        signature: 'ts=1700000000;h1=00'.padEnd(70, '0'),
      });
      expect(bad.status).toBe(401);

      const missing = await postWebhook(apiAgent(nestApp), payload, { signature: null });
      expect(missing.status).toBe(401);

      const oldTs = Math.floor(clockNowMs / 1000) - 10 * 60;
      const stale = await postWebhook(apiAgent(nestApp), payload, { tsSeconds: oldTs });
      expect(stale.status).toBe(401);

      const db: DrizzleDb = nestApp.get(DRIZZLE);
      const count = await db.execute(
        sql`SELECT count(*)::int AS c FROM billing_events WHERE provider_event_id = ${eventId}`,
      );
      expect((count.rows[0] as { c: number }).c).toBe(0);
    } finally {
      await nestApp.close();
    }
  });

  it('missing PADDLE_WEBHOOK_SECRET rejects webhooks with 401', async () => {
    const { nestApp, jwt } = await createAppWithFakePaddle({
      ...paddleEnvEnabled,
      PADDLE_WEBHOOK_SECRET: undefined,
    });
    try {
      const fresh = await signupFreshOrg(nestApp, jwt);
      const eventId = `evt-${newUuidV7()}`;
      const payload = subscriptionEventPayload({
        eventId,
        eventType: 'subscription.created',
        occurredAt: '2026-06-15T12:00:00.000Z',
        orgId: fresh.orgId,
        subscriptionId: `sub_${newUuidV7().slice(-12)}`,
        status: 'active',
        priceId: TEST_PRICE_RESTAURANT,
      });
      const res = await postWebhook(apiAgent(nestApp), payload);
      expect(res.status).toBe(401);
    } finally {
      await nestApp.close();
    }
  });

  it('out-of-order: older past_due after newer updated leaves newer state', async () => {
    const { nestApp, jwt } = await createAppWithFakePaddle();
    try {
      const fresh = await signupFreshOrg(nestApp, jwt);
      const subId = `sub_${newUuidV7().slice(-12)}`;
      const newer = subscriptionEventPayload({
        eventId: `evt-${newUuidV7()}`,
        eventType: 'subscription.updated',
        occurredAt: '2026-06-15T14:00:00.000Z',
        orgId: fresh.orgId,
        subscriptionId: subId,
        status: 'active',
        priceId: TEST_PRICE_RESTAURANT,
        currentPeriodEnd: '2026-07-15T12:00:00.000Z',
      });
      const older = subscriptionEventPayload({
        eventId: `evt-${newUuidV7()}`,
        eventType: 'subscription.past_due',
        occurredAt: '2026-06-15T13:00:00.000Z',
        orgId: fresh.orgId,
        subscriptionId: subId,
        status: 'past_due',
        priceId: TEST_PRICE_RESTAURANT,
      });
      expect((await postWebhook(apiAgent(nestApp), newer)).status).toBeLessThan(300);
      expect((await postWebhook(apiAgent(nestApp), older)).status).toBeLessThan(300);

      const me = await fresh.ownerAgent.get('/v1/me');
      expect((me.body as MeResponse).entitlements.status).toBe('active');
      expect((me.body as MeResponse).entitlements.reason).toBe('paid');
    } finally {
      await nestApp.close();
    }
  });

  it('past_due keeps features; canceled with future period end then free after clock advance', async () => {
    const { nestApp, jwt } = await createAppWithFakePaddle();
    try {
      const fresh = await signupFreshOrg(nestApp, jwt);
      const subId = `sub_${newUuidV7().slice(-12)}`;
      await postWebhook(
        apiAgent(nestApp),
        subscriptionEventPayload({
          eventId: `evt-${newUuidV7()}`,
          eventType: 'subscription.created',
          occurredAt: '2026-06-15T12:00:00.000Z',
          orgId: fresh.orgId,
          subscriptionId: subId,
          status: 'active',
          priceId: TEST_PRICE_RESTAURANT,
          currentPeriodEnd: '2026-07-01T00:00:00.000Z',
        }),
      );
      await postWebhook(
        apiAgent(nestApp),
        subscriptionEventPayload({
          eventId: `evt-${newUuidV7()}`,
          eventType: 'subscription.past_due',
          occurredAt: '2026-06-16T12:00:00.000Z',
          orgId: fresh.orgId,
          subscriptionId: subId,
          status: 'past_due',
          priceId: TEST_PRICE_RESTAURANT,
          currentPeriodEnd: '2026-07-01T00:00:00.000Z',
        }),
      );
      let me = await fresh.ownerAgent.get('/v1/me');
      expect((me.body as MeResponse).entitlements.reason).toBe('past_due');
      expect((me.body as MeResponse).entitlements.features).toContain('pos.access');

      await postWebhook(
        apiAgent(nestApp),
        subscriptionEventPayload({
          eventId: `evt-${newUuidV7()}`,
          eventType: 'subscription.canceled',
          occurredAt: '2026-06-17T12:00:00.000Z',
          orgId: fresh.orgId,
          subscriptionId: subId,
          status: 'canceled',
          priceId: TEST_PRICE_RESTAURANT,
          currentPeriodEnd: '2026-07-01T00:00:00.000Z',
        }),
      );
      me = await fresh.ownerAgent.get('/v1/me');
      expect((me.body as MeResponse).entitlements.reason).toBe('canceled');
      expect((me.body as MeResponse).entitlements.features).toContain('pos.access');

      clockNowMs = Date.parse('2026-07-02T00:00:00.000Z');
      me = await fresh.ownerAgent.get('/v1/me');
      expect((me.body as MeResponse).entitlements.planKey).toBe('free');
      expect((me.body as MeResponse).entitlements.reason).toBe('canceled');
    } finally {
      await nestApp.close();
    }
  });

  it('unknown price id and unknown orgId store event with error and leave subscription unchanged', async () => {
    const { nestApp, jwt } = await createAppWithFakePaddle();
    try {
      const fresh = await signupFreshOrg(nestApp, jwt);
      const before = await fresh.ownerAgent.get('/v1/me');
      const beforePlan = (before.body as MeResponse).entitlements.planKey;

      const unknownPriceId = `evt-${newUuidV7()}`;
      const unknownPrice = await postWebhook(
        apiAgent(nestApp),
        subscriptionEventPayload({
          eventId: unknownPriceId,
          eventType: 'subscription.updated',
          occurredAt: '2026-06-15T12:00:00.000Z',
          orgId: fresh.orgId,
          subscriptionId: `sub_${newUuidV7().slice(-12)}`,
          status: 'active',
          priceId: 'pri_unknown',
        }),
      );
      expect(unknownPrice.status).toBeLessThan(300);

      const unknownOrgId = `evt-${newUuidV7()}`;
      const unknownOrg = await postWebhook(
        apiAgent(nestApp),
        subscriptionEventPayload({
          eventId: unknownOrgId,
          eventType: 'subscription.created',
          occurredAt: '2026-06-15T12:00:00.000Z',
          orgId: newUuidV7(),
          subscriptionId: `sub_${newUuidV7().slice(-12)}`,
          status: 'active',
          priceId: TEST_PRICE_RESTAURANT,
        }),
      );
      expect(unknownOrg.status).toBeLessThan(300);

      const missingOrg = await postWebhook(
        apiAgent(nestApp),
        subscriptionEventPayload({
          eventId: `evt-${newUuidV7()}`,
          eventType: 'subscription.created',
          occurredAt: '2026-06-15T12:00:00.000Z',
          orgId: null,
          subscriptionId: `sub_${newUuidV7().slice(-12)}`,
          status: 'active',
          priceId: TEST_PRICE_RESTAURANT,
        }),
      );
      expect(missingOrg.status).toBeLessThan(300);

      // Signed but unmappable (no data object): stored with an error, not dropped.
      const unmappableId = `evt-${newUuidV7()}`;
      const unmappable = await postWebhook(apiAgent(nestApp), {
        event_id: unmappableId,
        event_type: 'subscription.created',
        occurred_at: '2026-06-15T12:00:00.000Z',
      });
      expect(unmappable.status).toBeLessThan(300);

      const me = await fresh.ownerAgent.get('/v1/me');
      expect((me.body as MeResponse).entitlements.planKey).toBe(beforePlan);

      const db: DrizzleDb = nestApp.get(DRIZZLE);
      const row = await db.execute(
        sql`SELECT error FROM billing_events WHERE provider_event_id = ${unknownPriceId}`,
      );
      expect((row.rows[0] as { error: string }).error).toBe('unknown_price_id');
      const unmappableRow = await db.execute(
        sql`SELECT error, processed_at FROM billing_events WHERE provider_event_id = ${unmappableId}`,
      );
      expect(unmappableRow.rows[0]).toMatchObject({ error: 'unmappable_payload' });
      expect((unmappableRow.rows[0] as { processed_at: unknown }).processed_at).not.toBeNull();
    } finally {
      await nestApp.close();
    }
  });

  it('retry after failed apply: same event redelivered is applied', async () => {
    const { nestApp, jwt } = await createAppWithFakePaddle();
    try {
      const fresh = await signupFreshOrg(nestApp, jwt);
      const repo = nestApp.get(BillingRepository);
      let calls = 0;
      const original = repo.updateSubscription.bind(repo);
      jest.spyOn(repo, 'updateSubscription').mockImplementation(async (...args) => {
        calls += 1;
        if (calls === 1) {
          throw new Error('simulated apply failure');
        }
        return original(...args);
      });

      const eventId = `evt-${newUuidV7()}`;
      const payload = subscriptionEventPayload({
        eventId,
        eventType: 'subscription.created',
        occurredAt: '2026-06-15T12:00:00.000Z',
        orgId: fresh.orgId,
        subscriptionId: `sub_${newUuidV7().slice(-12)}`,
        status: 'active',
        priceId: TEST_PRICE_RESTAURANT,
        currentPeriodEnd: '2026-07-15T12:00:00.000Z',
      });

      const first = await postWebhook(apiAgent(nestApp), payload);
      expect(first.status).toBeGreaterThanOrEqual(500);

      const second = await postWebhook(apiAgent(nestApp), payload);
      expect(second.status).toBeLessThan(300);

      const me = await fresh.ownerAgent.get('/v1/me');
      expect((me.body as MeResponse).entitlements.reason).toBe('paid');
    } finally {
      await nestApp.close();
    }
  });

  it('stray provider subscription id while live: error stored, row unchanged', async () => {
    const { nestApp, jwt } = await createAppWithFakePaddle();
    try {
      const fresh = await signupFreshOrg(nestApp, jwt);
      const liveSub = `sub_live_${newUuidV7().slice(-8)}`;
      await postWebhook(
        apiAgent(nestApp),
        subscriptionEventPayload({
          eventId: `evt-${newUuidV7()}`,
          eventType: 'subscription.created',
          occurredAt: '2026-06-15T12:00:00.000Z',
          orgId: fresh.orgId,
          subscriptionId: liveSub,
          status: 'active',
          priceId: TEST_PRICE_RESTAURANT,
          currentPeriodEnd: '2026-07-15T12:00:00.000Z',
        }),
      );

      const strayId = `evt-${newUuidV7()}`;
      await postWebhook(
        apiAgent(nestApp),
        subscriptionEventPayload({
          eventId: strayId,
          eventType: 'subscription.updated',
          occurredAt: '2026-06-15T13:00:00.000Z',
          orgId: fresh.orgId,
          subscriptionId: `sub_other_${newUuidV7().slice(-8)}`,
          status: 'past_due',
          priceId: TEST_PRICE_RESTAURANT,
        }),
      );

      const me = await fresh.ownerAgent.get('/v1/me');
      expect((me.body as MeResponse).entitlements.status).toBe('active');

      const db: DrizzleDb = nestApp.get(DRIZZLE);
      const row = await db.execute(
        sql`SELECT error FROM billing_events WHERE provider_event_id = ${strayId}`,
      );
      expect((row.rows[0] as { error: string }).error).toBe('stray_provider_subscription_id');

      await withOrg(db, fresh.orgId, async (tx) => {
        const sub = await nestApp.get(BillingRepository).findSubscriptionWithPlan(tx, fresh.orgId);
        expect(sub?.providerSubscriptionId).toBe(liveSub);
      });
    } finally {
      await nestApp.close();
    }
  });

  it('GET /v1/billing: owner OK; manager and cashier 403; checkoutEnabled false without API key', async () => {
    const { nestApp, jwt } = await createAppWithFakePaddle();
    try {
      const fresh = await signupFreshOrg(nestApp, jwt);
      const overview = await fresh.ownerAgent.get('/v1/billing');
      expect(overview.status).toBe(200);
      expect((overview.body as { checkoutEnabled: boolean }).checkoutEnabled).toBe(true);

      const mgrEmail = `mgr-${newUuidV7().slice(-8)}@example.com`;
      const invite = await fresh.ownerAgent.post('/v1/staff/invites').send({
        email: mgrEmail,
        name: 'Manager',
        roleKey: 'manager',
        allBranches: true,
        branchIds: [],
      });
      expect(invite.status).toBe(201);
      const token = extractInviteToken((invite.body as { inviteUrl: string }).inviteUrl);
      await apiAgent(nestApp).post('/v1/auth/accept-invite').send({
        token,
        password: fresh.password,
        name: 'Manager',
      });
      const mgrLogin = await apiAgent(nestApp).post('/v1/auth/login').send({
        email: mgrEmail,
        password: fresh.password,
      });
      const manager = withBearer(
        apiAgent(nestApp),
        (mgrLogin.body as { accessToken: string }).accessToken,
      );
      expect((await manager.get('/v1/billing')).status).toBe(403);

      const cashEmail = `csh-${newUuidV7().slice(-8)}@example.com`;
      const cInvite = await fresh.ownerAgent.post('/v1/staff/invites').send({
        email: cashEmail,
        name: 'Cashier',
        roleKey: 'cashier',
        allBranches: true,
        branchIds: [],
      });
      expect(cInvite.status).toBe(201);
      const cToken = extractInviteToken((cInvite.body as { inviteUrl: string }).inviteUrl);
      await apiAgent(nestApp).post('/v1/auth/accept-invite').send({
        token: cToken,
        password: fresh.password,
        name: 'Cashier',
      });
      const cashLogin = await apiAgent(nestApp).post('/v1/auth/login').send({
        email: cashEmail,
        password: fresh.password,
      });
      const cashier = withBearer(
        apiAgent(nestApp),
        (cashLogin.body as { accessToken: string }).accessToken,
      );
      expect((await cashier.get('/v1/billing')).status).toBe(403);
    } finally {
      await nestApp.close();
    }

    const disabled = await createAppWithFakePaddle({
      PADDLE_ENV: 'sandbox',
      PADDLE_API_KEY: undefined,
      PADDLE_WEBHOOK_SECRET: TEST_PADDLE_SECRET,
      PADDLE_PRICE_MENU: undefined,
      PADDLE_PRICE_RESTAURANT: undefined,
      PADDLE_PRICE_BUSINESS: undefined,
    });
    try {
      const fresh = await signupFreshOrg(disabled.nestApp, disabled.jwt);
      const overview = await fresh.ownerAgent.get('/v1/billing');
      expect(overview.status).toBe(200);
      expect((overview.body as { checkoutEnabled: boolean }).checkoutEnabled).toBe(false);
    } finally {
      await disabled.nestApp.close();
    }
  });

  it('checkout: quantity 2 for restaurant with 2 branches; free 400; paid same plan 409; live paddle 409 CHANGE_PLAN', async () => {
    const { nestApp, jwt } = await createAppWithFakePaddle();
    try {
      const fresh = await signupFreshOrg(nestApp, jwt);
      await createIsolatedBranch(fresh.ownerAgent);

      const checkout = await fresh.ownerAgent.post('/v1/billing/checkout').send({
        planKey: 'restaurant',
      });
      expect([200, 201]).toContain(checkout.status);
      expect((checkout.body as { quantity: number; priceId: string }).quantity).toBe(2);
      expect((checkout.body as { priceId: string }).priceId).toBe(priceIdForTestPlan('restaurant'));

      const free = await fresh.ownerAgent.post('/v1/billing/checkout').send({ planKey: 'free' });
      expect(free.status).toBe(400);

      await nestApp.get(SubscriptionService).applySubscriptionPatch(fresh.orgId, {
        planId: PLAN_IDS.restaurant,
        status: 'active',
        provider: null,
        trialEndsAt: null,
      });
      // comp restaurant is effective paid/comp — same plan checkout
      const same = await fresh.ownerAgent.post('/v1/billing/checkout').send({
        planKey: 'restaurant',
      });
      expect(same.status).toBe(409);

      await nestApp.get(SubscriptionService).applySubscriptionPatch(fresh.orgId, {
        planId: PLAN_IDS.restaurant,
        status: 'active',
        provider: 'paddle',
        providerSubscriptionId: `sub_${newUuidV7().slice(-8)}`,
        providerCustomerId: 'ctm_live',
        trialEndsAt: null,
        currentPeriodEnd: new Date('2026-07-15T12:00:00.000Z'),
      });
      const live = await fresh.ownerAgent.post('/v1/billing/checkout').send({
        planKey: 'business',
      });
      expect(live.status).toBe(409);
      expect((live.body as ApiErrorBody).error.code).toBe('BILLING_USE_CHANGE_PLAN');
    } finally {
      await nestApp.close();
    }
  });

  it('change-plan and portal call fake with expected args and do not change DB', async () => {
    const { nestApp, jwt, fake } = await createAppWithFakePaddle();
    try {
      const fresh = await signupFreshOrg(nestApp, jwt);
      const subId = `sub_${newUuidV7().slice(-8)}`;
      await nestApp.get(SubscriptionService).applySubscriptionPatch(fresh.orgId, {
        planId: PLAN_IDS.menu,
        status: 'active',
        provider: 'paddle',
        providerSubscriptionId: subId,
        providerCustomerId: 'ctm_portal',
        trialEndsAt: null,
        currentPeriodEnd: new Date('2026-07-15T12:00:00.000Z'),
        scheduledChange: { action: 'cancel' },
      });

      await createIsolatedBranch(fresh.ownerAgent);

      const unknownPlan = await fresh.ownerAgent.post('/v1/billing/change-plan').send({
        planKey: 'gold',
      });
      expect(unknownPlan.status).toBe(400);

      // Same plan with a scheduled cancel: only the scheduled change is removed.
      const undoCancel = await fresh.ownerAgent.post('/v1/billing/change-plan').send({
        planKey: 'menu',
      });
      expect([200, 201]).toContain(undoCancel.status);
      expect(fake.updateCalls).toEqual([
        { subscriptionId: subId, body: { scheduled_change: null } },
      ]);

      const change = await fresh.ownerAgent.post('/v1/billing/change-plan').send({
        planKey: 'restaurant',
      });
      expect([200, 201]).toContain(change.status);
      expect(fake.updateCalls).toHaveLength(2);
      expect(fake.updateCalls[1]).toEqual({
        subscriptionId: subId,
        body: {
          items: [{ price_id: TEST_PRICE_RESTAURANT, quantity: 2 }],
          proration_billing_mode: 'prorated_immediately',
          scheduled_change: null,
        },
      });

      const db: DrizzleDb = nestApp.get(DRIZZLE);
      await withOrg(db, fresh.orgId, async (tx) => {
        const row = await nestApp.get(BillingRepository).findSubscriptionWithPlan(tx, fresh.orgId);
        expect(row?.planKey).toBe('menu');
      });

      // Same plan with no pending change is still a conflict, and Paddle is not called.
      await nestApp.get(SubscriptionService).applySubscriptionPatch(fresh.orgId, {
        scheduledChange: null,
      });
      const samePlan = await fresh.ownerAgent.post('/v1/billing/change-plan').send({
        planKey: 'menu',
      });
      expect(samePlan.status).toBe(409);
      expect(fake.updateCalls).toHaveLength(2);

      const portal = await fresh.ownerAgent.post('/v1/billing/portal').send({});
      expect([200, 201]).toContain(portal.status);
      expect(fake.portalCalls).toEqual([{ customerId: 'ctm_portal' }]);
      expect((portal.body as { url: string }).url).toBe(fake.portalUrl);

      await nestApp.get(SubscriptionService).applySubscriptionPatch(fresh.orgId, {
        providerCustomerId: null,
      });
      const noCustomer = await fresh.ownerAgent.post('/v1/billing/portal').send({});
      expect(noCustomer.status).toBe(409);
      expect((noCustomer.body as ApiErrorBody).error.code).toBe('BILLING_NO_SUBSCRIPTION');
    } finally {
      await nestApp.close();
    }
  });
});
