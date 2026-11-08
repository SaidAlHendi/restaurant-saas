import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import { loadEnv, resetEnvCacheForTests } from '../src/config/env';
import { ADMIN_DRIZZLE, type AdminDrizzleDb } from '../src/core/db/admin-db.tokens';
import { adminUsers } from '../src/core/db/schema/admin';
import { organizations } from '../src/core/db/schema/tenancy';
import { newUuidV7 } from '../src/lib/uuid';
import { AppModule } from '../src/app.module';

import { apiAgent, withBearer } from './http';

const PASSWORD = 'correct-horse-battery-staple';
const runId = String(Date.now());

interface ListBody {
  items: {
    id: string;
    name: string;
    status: string;
    ownerEmail: string | null;
    planKey: string | null;
    branchCount: number;
  }[];
  page: number;
  pageSize: number;
  total: number;
}

interface Org {
  id: string;
  email: string;
  name: string;
  token: string;
}

describe('Admin restaurants list and detail (e2e)', () => {
  let app: INestApplication;
  let adminDb: AdminDrizzleDb;
  let ownerPool: pg.Pool;
  let adminToken: string;
  const adminId = newUuidV7();
  const adminEmail = `orgs-admin-${runId}@admin.test`;
  let orgA: Org;
  let orgB: Org;

  async function signup(tag: string) {
    const email = `orgs-${tag}-${runId}@example.com`;
    const name = `Orgs Cafe ${tag} ${runId}`;
    const res = await apiAgent(app)
      .post('/v1/auth/signup')
      .send({
        name: `Owner ${tag}`,
        email,
        password: 'password-1234',
        restaurantName: name,
        country: 'SA',
        timezone: 'Asia/Riyadh',
        currency: 'SAR',
        defaultLocale: 'en',
      });
    expect(res.status).toBe(201);
    const body = res.body as { accessToken: string; org: { id: string } };
    return { id: body.org.id, email, name, token: body.accessToken };
  }

  beforeAll(async () => {
    resetEnvCacheForTests();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    app.use(cookieParser());
    await app.init();
    adminDb = app.get<AdminDrizzleDb>(ADMIN_DRIZZLE);

    ownerPool = new pg.Pool({ connectionString: loadEnv().DATABASE_MIGRATION_URL });
    await drizzle(ownerPool)
      .insert(adminUsers)
      .values({
        id: adminId,
        email: adminEmail,
        passwordHash: await argon2.hash(PASSWORD, { type: argon2.argon2id }),
        name: 'Support',
        role: 'support',
      });
    const login = await apiAgent(app)
      .post('/v1/admin/auth/login')
      .send({ email: adminEmail, password: PASSWORD });
    adminToken = (login.body as { accessToken: string }).accessToken;

    orgA = await signup('a');
    orgB = await signup('b');
    await adminDb
      .update(organizations)
      .set({ status: 'suspended' })
      .where(eq(organizations.id, orgB.id));
  });

  afterAll(async () => {
    await ownerPool.end();
    await app.close();
  });

  const admin = () => withBearer(apiAgent(app), adminToken);

  it('requires an admin token; tenant tokens are rejected', async () => {
    expect((await apiAgent(app).get('/v1/admin/orgs')).status).toBe(401);
    expect((await withBearer(apiAgent(app), orgA.token).get('/v1/admin/orgs')).status).toBe(401);
    expect((await apiAgent(app).get(`/v1/admin/orgs/${orgA.id}`)).status).toBe(401);
  });

  it('lists organizations across tenants with owner, plan and branch count', async () => {
    const res = await admin().get('/v1/admin/orgs').query({ q: runId });
    expect(res.status).toBe(200);
    const body = res.body as ListBody;
    expect(body.total).toBe(2);
    expect(body.page).toBe(1);
    const a = body.items.find((i) => i.id === orgA.id);
    expect(a).toMatchObject({ ownerEmail: orgA.email, branchCount: 1, status: 'active' });
    expect(a?.planKey).toEqual(expect.any(String));
  });

  it('filters by status, searches by name and slug, and escapes wildcards', async () => {
    const suspended = await admin().get('/v1/admin/orgs').query({ q: runId, status: 'suspended' });
    expect((suspended.body as ListBody).items.map((i) => i.id)).toEqual([orgB.id]);

    const byName = await admin().get('/v1/admin/orgs').query({ q: orgA.name.toUpperCase() });
    expect((byName.body as ListBody).items.map((i) => i.id)).toEqual([orgA.id]);

    const wildcard = await admin().get('/v1/admin/orgs').query({ q: '%' });
    expect((wildcard.body as ListBody).total).toBe(0);
  });

  it('paginates', async () => {
    const p1 = await admin().get('/v1/admin/orgs').query({ q: runId, pageSize: 1, page: 1 });
    const p2 = await admin().get('/v1/admin/orgs').query({ q: runId, pageSize: 1, page: 2 });
    const b1 = p1.body as ListBody;
    const b2 = p2.body as ListBody;
    expect(b1.items).toHaveLength(1);
    expect(b2.items).toHaveLength(1);
    expect(b1.items[0]?.id).not.toBe(b2.items[0]?.id);
    expect(b1.total).toBe(2);
    expect((await admin().get('/v1/admin/orgs').query({ pageSize: 1000 })).status).toBe(400);
    expect((await admin().get('/v1/admin/orgs').query({ status: 'nope' })).status).toBe(400);
  });

  it('returns org detail, 404 for unknown and 400 for malformed ids', async () => {
    const res = await admin().get(`/v1/admin/orgs/${orgA.id}`);
    expect(res.status).toBe(200);
    const body = res.body as {
      id: string;
      ownerEmail: string;
      memberCount: number;
      branches: unknown[];
      subscription: { status: string } | null;
      defaultCurrency: string;
    };
    expect(body).toMatchObject({ id: orgA.id, ownerEmail: orgA.email, memberCount: 1 });
    expect(body.branches).toHaveLength(1);
    expect(body.subscription).not.toBeNull();
    expect(body.defaultCurrency).toBe('SAR');
    expect(JSON.stringify(body)).not.toMatch(/password/i);

    expect((await admin().get(`/v1/admin/orgs/${newUuidV7()}`)).status).toBe(404);
    expect((await admin().get('/v1/admin/orgs/not-a-uuid')).status).toBe(400);
  });
});
