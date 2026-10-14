import { eq, sql } from 'drizzle-orm';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import type { Agent } from 'supertest';

import { PLAN_IDS, type MeResponse } from '@app/shared';

import { AppModule } from '../src/app.module';
import { JwtAccessService } from '../src/core/auth/jwt.service';
import { CLOCK } from '../src/core/clock/clock.tokens';
import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { organizations } from '../src/core/db/schema/tenancy';
import { withOrg } from '../src/core/db/with-org';
import { newUuidV7 } from '../src/lib/uuid';
import { EntitlementsService } from '../src/modules/billing/entitlements.service';
import { SubscriptionService } from '../src/modules/billing/subscription.service';

import { categoryBody, productBody } from './catalog-helpers';
import { createTestApp } from './create-test-app';
import { apiAgent } from './http';
import { postOrder } from './ordering-helpers';
import { signupFreshOrg } from './staff-settings-helpers';

type ApiErrorBody = {
  error: { code: string; message: string; details: Record<string, unknown> };
};

function expectApiError(res: { status: number; body: unknown }, code: string): ApiErrorBody {
  expect(res.status).toBe(403);
  const body = res.body as ApiErrorBody;
  expect(body.error.code).toBe(code);
  return body;
}

describe('Billing 2a (e2e)', () => {
  let defaultApp: INestApplication;
  let defaultAgent: Agent;

  beforeAll(async () => {
    ({ app: defaultApp } = await createTestApp());
    defaultAgent = apiAgent(defaultApp);
  });

  afterAll(async () => {
    await defaultApp.close();
  });

  it('signup creates trialing restaurant subscription and /me entitlements', async () => {
    const fresh = await signupFreshOrg(defaultApp, defaultApp.get(JwtAccessService));
    const me = await fresh.ownerAgent.get('/v1/me');
    expect(me.status).toBe(200);
    const body = me.body as MeResponse;
    expect(body.entitlements.planKey).toBe('restaurant');
    expect(body.entitlements.reason).toBe('trial');
    expect(body.entitlements.features).toContain('pos.access');
    expect(body.entitlements.trialEndsAt).not.toBeNull();
    const trialEnd = Date.parse(body.entitlements.trialEndsAt ?? '');
    const diffDays = (trialEnd - Date.now()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeGreaterThan(13);
    expect(diffDays).toBeLessThan(15);
  });

  it('trial expired: POS, orders, kitchen, report blocked; catalog read ok; /me free', async () => {
    let nowMs = Date.parse('2026-03-01T12:00:00.000Z');
    const clock = { now: () => new Date(nowMs) };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CLOCK)
      .useValue(clock)
      .compile();
    const app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
    const agent = apiAgent(app);
    const jwt = app.get(JwtAccessService);

    try {
      const fresh = await signupFreshOrg(app, jwt);
      nowMs = Date.parse('2026-03-20T12:00:00.000Z');

      const posMenu = await fresh.ownerAgent.get(`/v1/branches/${fresh.branchId}/pos/menu`);
      const posErr = expectApiError(posMenu, 'PLAN_FEATURE_REQUIRED');
      expect(posErr.error.details['feature']).toBe('pos.access');

      const { productId } = await (async () => {
        const cat = await fresh.ownerAgent.post('/v1/categories').send(categoryBody());
        const categoryId = (cat.body as { id: string }).id;
        const prod = await fresh.ownerAgent.post('/v1/products').send(productBody(categoryId, 1000));
        return { productId: (prod.body as { id: string }).id };
      })();

      const order = await postOrder(fresh.ownerAgent, fresh.branchId, {
        clientOrderId: newUuidV7(),
        type: 'takeaway',
        items: [{ productId, quantity: 1, modifierIds: [] }],
      });
      expectApiError(order, 'PLAN_FEATURE_REQUIRED');

      const kitchen = await fresh.ownerAgent.get(
        `/v1/branches/${fresh.branchId}/kitchen/board`,
      );
      expectApiError(kitchen, 'PLAN_FEATURE_REQUIRED');

      const report = await fresh.ownerAgent.get(`/v1/branches/${fresh.branchId}/reports/daily`);
      expectApiError(report, 'PLAN_FEATURE_REQUIRED');

      const products = await fresh.ownerAgent.get('/v1/products?limit=10');
      expect(products.status).toBe(200);

      const orders = await fresh.ownerAgent.get(
        `/v1/branches/${fresh.branchId}/orders?limit=10`,
      );
      expect(orders.status).toBe(200);

      const me = await fresh.ownerAgent.get('/v1/me');
      const meBody = me.body as MeResponse;
      expect(meBody.entitlements.planKey).toBe('free');
      expect(meBody.entitlements.reason).toBe('trial_expired');
    } finally {
      await app.close();
    }
  });

  it('free plan: 41st product blocked; over-limit catalog still editable; public menu poweredBy', async () => {
    const freshLimit = await signupFreshOrg(defaultApp, defaultApp.get(JwtAccessService));
    const subs = defaultApp.get(SubscriptionService);
    await subs.applySubscriptionPatch(freshLimit.orgId, {
      planId: PLAN_IDS.free,
      status: 'active',
      provider: null,
      trialEndsAt: null,
    });

    const cat = await freshLimit.ownerAgent.post('/v1/categories').send(categoryBody());
    const categoryId = (cat.body as { id: string }).id;

    for (let i = 0; i < 40; i += 1) {
      const suffix = `${String(i)}-${newUuidV7().slice(-6)}`;
      const res = await freshLimit.ownerAgent.post('/v1/products').send({
        ...productBody(categoryId, 1000 + i),
        name: { en: `Item ${suffix}`, ar: `صنف ${suffix}` },
      });
      expect(res.status).toBe(201);
    }

    const blocked = await freshLimit.ownerAgent.post('/v1/products').send({
      ...productBody(categoryId, 5000),
      name: { en: 'Forty-first', ar: 'حادي وأربعون' },
    });
    const limitErr = expectApiError(blocked, 'PLAN_LIMIT_REACHED');
    expect(limitErr.error.details['limit']).toBe('limit.products');
    expect(limitErr.error.details['max']).toBe(40);

    const freshOver = await signupFreshOrg(defaultApp, defaultApp.get(JwtAccessService));
    const cat2 = await freshOver.ownerAgent.post('/v1/categories').send(categoryBody());
    const categoryId2 = (cat2.body as { id: string }).id;
    for (let i = 0; i < 45; i += 1) {
      const suffix = `${String(i)}-${newUuidV7().slice(-6)}`;
      const res = await freshOver.ownerAgent.post('/v1/products').send({
        ...productBody(categoryId2, 1000),
        name: { en: `Over ${suffix}`, ar: `ز ${suffix}` },
      });
      expect(res.status).toBe(201);
    }
    await subs.applySubscriptionPatch(freshOver.orgId, {
      planId: PLAN_IDS.free,
      status: 'active',
      provider: null,
      trialEndsAt: null,
    });
    const list = await freshOver.ownerAgent.get('/v1/products?limit=100');
    const items = (list.body as { items: Array<{ id: string; isActive: boolean }> }).items;
    const target = items[0];
    expect(target).toBeDefined();
    if (target) {
      const patched = await freshOver.ownerAgent.patch(`/v1/products/${target.id}`).send({
        isActive: !target.isActive,
      });
      expect(patched.status).toBe(200);
    }

    const freshMenu = await signupFreshOrg(defaultApp, defaultApp.get(JwtAccessService));
    await subs.applySubscriptionPatch(freshMenu.orgId, {
      planId: PLAN_IDS.free,
      status: 'active',
      provider: null,
      trialEndsAt: null,
    });
    const me = await freshMenu.ownerAgent.get('/v1/me');
    const slug = (me.body as MeResponse).org.slug;
    const menu = await defaultAgent.get(`/v1/public/menus/${slug}`);
    expect(menu.status).toBe(200);
    const menuBody = menu.body as {
      org: { locales: string[]; defaultLocale: string };
      poweredBy?: boolean;
    };
    expect(menuBody.org.locales).toEqual([menuBody.org.defaultLocale]);
    expect(menuBody.poweredBy).toBe(true);
  });

  it('free plan staff invite limit; restaurant trial 11th branch member blocked', async () => {
    const freshFree = await signupFreshOrg(defaultApp, defaultApp.get(JwtAccessService));
    await defaultApp.get(SubscriptionService).applySubscriptionPatch(freshFree.orgId, {
      planId: PLAN_IDS.free,
      status: 'active',
      provider: null,
    });
    const invite = await freshFree.ownerAgent.post('/v1/staff/invites').send({
      email: `mgr-${newUuidV7().slice(-8)}@example.com`,
      name: 'Manager',
      roleKey: 'manager',
      allBranches: true,
      branchIds: [],
    });
    expectApiError(invite, 'PLAN_LIMIT_REACHED');

    const freshTrial = await signupFreshOrg(defaultApp, defaultApp.get(JwtAccessService));
    for (let i = 0; i < 9; i += 1) {
      const pin = await freshTrial.ownerAgent.post('/v1/staff/pin-only').send({
        name: `Staff ${String(i)}`,
        pin: `${String(1000 + i).padStart(4, '0')}`,
        roleKey: 'cashier',
        allBranches: true,
        branchIds: [],
      });
      expect(pin.status).toBe(201);
    }
    const eleventh = await freshTrial.ownerAgent.post('/v1/staff/pin-only').send({
      name: 'Staff eleventh',
      pin: '8888',
      roleKey: 'cashier',
      allBranches: true,
      branchIds: [],
    });
    expectApiError(eleventh, 'PLAN_LIMIT_REACHED');
  });

  it('suspended org: public menu 410 and excluded from sitemap', async () => {
    const fresh = await signupFreshOrg(defaultApp, defaultApp.get(JwtAccessService));
    const db = defaultApp.get(DRIZZLE);
    await withOrg(db, fresh.orgId, async (tx) => {
      await tx
        .update(organizations)
        .set({ status: 'suspended' })
        .where(eq(organizations.id, fresh.orgId));
    });
    const me = await fresh.ownerAgent.get('/v1/me');
    const slug = (me.body as MeResponse).org.slug;
    const menu = await defaultAgent.get(`/v1/public/menus/${slug}`);
    expect(menu.status).toBe(410);
    const sitemap = await defaultAgent.get('/v1/public/menus/sitemap');
    const slugs = (sitemap.body as { items: Array<{ slug: string }> }).items.map((i) => i.slug);
    expect(slugs).not.toContain(slug);
  });

  it('comp business subscription allows all features', async () => {
    const fresh = await signupFreshOrg(defaultApp, defaultApp.get(JwtAccessService));
    await defaultApp.get(SubscriptionService).applySubscriptionPatch(fresh.orgId, {
      planId: PLAN_IDS.business,
      status: 'active',
      provider: null,
      trialEndsAt: null,
    });
    const me = await fresh.ownerAgent.get('/v1/me');
    const ent = (me.body as MeResponse).entitlements;
    expect(ent.planKey).toBe('business');
    expect(ent.reason).toBe('comp');
    expect(ent.features).toContain('pos.access');
    expect(ent.features).toContain('reports.advanced');
    expect(ent.features).toContain('api.access');

    const pos = await fresh.ownerAgent.get(`/v1/branches/${fresh.branchId}/pos/menu`);
    expect(pos.status).toBe(200);
  });

  it('RLS: cannot read other org subscription; app_user cannot write plans', async () => {
    const a = await signupFreshOrg(defaultApp, defaultApp.get(JwtAccessService));
    const b = await signupFreshOrg(defaultApp, defaultApp.get(JwtAccessService));
    const db = defaultApp.get(DRIZZLE);
    let aPlanKey = '';
    await withOrg(db, a.orgId, async (tx) => {
      const row = await tx.execute(
        sql`SELECT p.key AS plan_key FROM subscriptions s INNER JOIN plans p ON p.id = s.plan_id WHERE s.org_id = ${a.orgId}`,
      );
      aPlanKey = (row.rows[0] as { plan_key: string }).plan_key;
    });
    expect(aPlanKey).toBe('restaurant');

    await withOrg(db, b.orgId, async (tx) => {
      const row = await tx.execute(
        sql`SELECT count(*)::int AS c FROM subscriptions WHERE org_id = ${a.orgId}`,
      );
      expect((row.rows[0] as { c: number }).c).toBe(0);
    });

    await expect(
      db.execute(sql`INSERT INTO plans (id, key, name, price_minor, sort_order) VALUES (gen_random_uuid(), 'hack', 'Hack', 0, 99)`),
    ).rejects.toThrow();
  });

  it('cache invalidates after subscription patch via SubscriptionService', async () => {
    const fresh = await signupFreshOrg(defaultApp, defaultApp.get(JwtAccessService));
    const entitlements = defaultApp.get(EntitlementsService);
    const subs = defaultApp.get(SubscriptionService);
    const before = await entitlements.getEntitlements(fresh.orgId);
    expect(before.planKey).toBe('restaurant');
    expect(before.features).toContain('pos.access');

    await subs.applySubscriptionPatch(fresh.orgId, {
      planId: PLAN_IDS.free,
      status: 'active',
      provider: null,
      trialEndsAt: null,
    });

    const after = await entitlements.getEntitlements(fresh.orgId);
    expect(after.planKey).toBe('free');
    expect(after.features).not.toContain('pos.access');
  });
});
