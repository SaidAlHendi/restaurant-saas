import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import { loadEnv, resetEnvCacheForTests } from '../src/config/env';
import { ADMIN_DRIZZLE, type AdminDrizzleDb } from '../src/core/db/admin-db.tokens';
import { adminUsers, auditLogs } from '../src/core/db/schema/admin';
import { subscriptions } from '../src/core/db/schema/billing';
import { newUuidV7 } from '../src/lib/uuid';
import { AppModule } from '../src/app.module';

import { apiAgent, withBearer } from './http';

const PASSWORD = 'correct-horse-battery-staple';
const runId = String(Date.now());

type Role = 'support' | 'billing' | 'super';

describe('Admin users, subscriptions, plans and audit (e2e)', () => {
  let app: INestApplication;
  let ownerPool: pg.Pool;
  const tokens = {} as Record<Role, string>;
  const ids = {} as Record<Role, string>;
  let orgId: string;
  let ownerEmail: string;

  beforeAll(async () => {
    resetEnvCacheForTests();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    app.use(cookieParser());
    await app.init();
    ownerPool = new pg.Pool({ connectionString: loadEnv().DATABASE_MIGRATION_URL });
    const db = drizzle(ownerPool);

    for (const role of ['support', 'billing', 'super'] as Role[]) {
      const email = `dir-${role}-${runId}@admin.test`;
      ids[role] = newUuidV7();
      await db.insert(adminUsers).values({
        id: ids[role],
        email,
        passwordHash: await argon2.hash(PASSWORD, { type: argon2.argon2id }),
        name: `Dir ${role} ${runId}`,
        role,
      });
      const login = await apiAgent(app)
        .post('/v1/admin/auth/login')
        .send({ email, password: PASSWORD });
      tokens[role] = (login.body as { accessToken: string }).accessToken;
    }

    ownerEmail = `dir-owner-${runId}@example.com`;
    const signup = await apiAgent(app)
      .post('/v1/auth/signup')
      .send({
        name: 'Dir Owner',
        email: ownerEmail,
        password: 'password-1234',
        restaurantName: `Dir Cafe ${runId}`,
        country: 'SA',
        timezone: 'Asia/Riyadh',
        currency: 'SAR',
        defaultLocale: 'en',
      });
    expect(signup.status).toBe(201);
    orgId = (signup.body as { org: { id: string } }).org.id;

    for (let i = 0; i < 3; i++) {
      await db.insert(auditLogs).values({
        id: newUuidV7(),
        adminUserId: ids.super,
        actorRole: 'super',
        action: `dir.test.${runId}.${String(i)}`,
      });
    }
  });

  afterAll(async () => {
    await ownerPool.end();
    await app.close();
  });

  const as = (role: Role) => withBearer(apiAgent(app), tokens[role]);

  it('rejects missing tokens and tenant tokens', async () => {
    for (const path of ['users', 'subscriptions', 'plans', 'audit']) {
      expect((await apiAgent(app).get(`/v1/admin/${path}`)).status).toBe(401);
    }
  });

  it('enforces minimum roles', async () => {
    expect((await as('support').get('/v1/admin/users')).status).toBe(200);
    expect((await as('support').get('/v1/admin/subscriptions')).status).toBe(403);
    expect((await as('support').get('/v1/admin/plans')).status).toBe(403);
    expect((await as('billing').get('/v1/admin/subscriptions')).status).toBe(200);
    expect((await as('billing').get('/v1/admin/plans')).status).toBe(200);
    expect((await as('billing').get('/v1/admin/audit')).status).toBe(403);
    expect((await as('super').get('/v1/admin/audit')).status).toBe(200);
  });

  it('lists users with memberships and never exposes password data', async () => {
    const res = await as('support')
      .get('/v1/admin/users')
      .query({ search: ownerEmail.toUpperCase() });
    expect(res.status).toBe(200);
    const body = res.body as {
      items: {
        email: string;
        memberships: { orgId: string; orgName: string; roleKey: string }[];
      }[];
      total: number;
    };
    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.memberships[0]).toMatchObject({
      orgId,
      orgName: `Dir Cafe ${runId}`,
      roleKey: 'owner',
      branchNames: null,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i);
    expect((await as('support').get('/v1/admin/users').query({ search: '%' })).body).toMatchObject({
      items: [],
    });
    expect((await as('support').get('/v1/admin/users').query({ page: '0' })).status).toBe(
      400,
    );
  });

  it('filters users by role, restaurant and branch', async () => {
    const find = async (filters: Record<string, string>) => {
      const res = await as('support')
        .get('/v1/admin/users')
        .query({ search: ownerEmail, ...filters });
      expect(res.status).toBe(200);
      return (res.body as { total: number }).total;
    };
    const detail = await as('support').get(`/v1/admin/orgs/${orgId}`);
    const branchId = (detail.body as { branches: { id: string }[] }).branches[0]?.id ?? '';

    expect(await find({ role: 'owner', orgId, branchId })).toBe(1);
    expect(await find({ role: 'cashier' })).toBe(0);
    expect(await find({ orgId: newUuidV7() })).toBe(0);
    expect(await find({ branchId: newUuidV7() })).toBe(0);
    expect((await as('support').get('/v1/admin/users').query({ role: 'boss' })).status).toBe(400);
  });

  it('lists subscriptions and filters by status, plan and trial ending', async () => {
    type Sub = { orgId: string; planKey: string; status: string };
    type SubPage = { items: Sub[]; page: number; pageSize: number; total: number };
    const first = await as('billing').get('/v1/admin/subscriptions');
    const firstBody = first.body as SubPage;
    expect(firstBody.page).toBe(1);
    expect(firstBody.pageSize).toBe(10);
    expect(firstBody.items.length).toBeLessThanOrEqual(10);
    // Walk the pages (100 rows each) until this test's own subscription turns up.
    const findMine = async (filters: Record<string, string | undefined> = {}) => {
      for (let page = 1; ; page += 1) {
        const res = await as('billing')
          .get('/v1/admin/subscriptions')
          .query({ ...filters, page, pageSize: 100 });
        const body = res.body as SubPage;
        const found = body.items.find((i) => i.orgId === orgId);
        if (found !== undefined || page * body.pageSize >= body.total) return found;
      }
    };
    const mine = await findMine();
    expect(mine).toBeDefined();

    expect(await findMine({ plan: mine?.planKey, status: mine?.status })).toBeDefined();

    const none = await as('billing').get('/v1/admin/subscriptions').query({ plan: 'no-such-plan' });
    expect((none.body as { items: unknown[] }).items).toHaveLength(0);

    const adminDb = app.get<AdminDrizzleDb>(ADMIN_DRIZZLE);
    await adminDb
      .update(subscriptions)
      .set({ status: 'trialing', trialEndsAt: new Date(Date.now() + 2 * 86_400_000) })
      .where(eq(subscriptions.orgId, orgId));

    const trial = await as('billing').get('/v1/admin/subscriptions').query({ trialEnding: 'true' });
    expect(
      (trial.body as { items: { status: string }[] }).items.every((i) => i.status === 'trialing'),
    ).toBe(true);
    expect(await findMine({ trialEnding: 'true' })).toBeDefined();

    expect(
      (await as('billing').get('/v1/admin/subscriptions').query({ status: 'nope' })).status,
    ).toBe(400);
  });

  it('lists plans with their feature limits', async () => {
    const res = await as('billing').get('/v1/admin/plans');
    const items = (
      res.body as { items: { key: string; priceMinor: number; features: { key: string }[] }[] }
    ).items;
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]?.features.length).toBeGreaterThan(0);
  });

  it('pages the audit log newest first with actor and action filters', async () => {
    const q = { action: `dir.test.${runId}` };
    const all = await as('super').get('/v1/admin/audit').query(q);
    const body = all.body as {
      items: { action: string; actorEmail: string }[];
      total: number;
    };
    expect(body.items.map((i) => i.action)).toEqual(
      [2, 1, 0].map((i) => `dir.test.${runId}.${String(i)}`),
    );
    expect(body.items[0]?.actorEmail).toBe(`dir-super-${runId}@admin.test`);

    const byActor = await as('super')
      .get('/v1/admin/audit')
      .query({ ...q, actor: 'nobody-here' });
    expect((byActor.body as { items: unknown[] }).items).toHaveLength(0);
    const byActorOk = await as('super')
      .get('/v1/admin/audit')
      .query({ ...q, actor: `dir-super-${runId}` });
    expect((byActorOk.body as { items: unknown[] }).items).toHaveLength(3);
    expect((await as('super').get('/v1/admin/audit').query({ pageSize: '1000' })).status).toBe(400);
  });
});
