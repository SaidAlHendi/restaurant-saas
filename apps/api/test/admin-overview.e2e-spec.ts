import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { adminOverviewSchema, type AdminOverview } from '@app/shared';

import { loadEnv, resetEnvCacheForTests } from '../src/config/env';
import { ADMIN_DRIZZLE, type AdminDrizzleDb } from '../src/core/db/admin-db.tokens';
import { adminUsers } from '../src/core/db/schema/admin';
import { branches, memberships, organizations } from '../src/core/db/schema/tenancy';
import { newUuidV7 } from '../src/lib/uuid';
import { AppModule } from '../src/app.module';

import { apiAgent, withBearer } from './http';

const PASSWORD = 'correct-horse-battery-staple';
const runId = String(Date.now());

describe('Admin overview (e2e)', () => {
  let app: INestApplication;
  let adminDb: AdminDrizzleDb;
  let ownerPool: pg.Pool;
  let supportToken: string;
  let tenantToken: string;
  let orgId: string;

  /** Runs SQL as the table owner with the tenant context set, so row-level security lets it through. */
  const asOrg = async (text: string, params: unknown[]) => {
    const client = await ownerPool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.org_id', $1, true)`, [orgId]);
      await client.query(text, params);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  };

  const get = async (): Promise<AdminOverview> => {
    const res = await withBearer(apiAgent(app), supportToken).get('/v1/admin/overview');
    expect(res.status).toBe(200);
    return adminOverviewSchema.parse(res.body);
  };

  beforeAll(async () => {
    resetEnvCacheForTests();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    app.use(cookieParser());
    await app.init();
    adminDb = app.get<AdminDrizzleDb>(ADMIN_DRIZZLE);
    ownerPool = new pg.Pool({ connectionString: loadEnv().DATABASE_MIGRATION_URL });

    const email = `overview-support-${runId}@admin.test`;
    await drizzle(ownerPool)
      .insert(adminUsers)
      .values({
        id: newUuidV7(),
        email,
        passwordHash: await argon2.hash(PASSWORD, { type: argon2.argon2id }),
        name: 'Support',
        role: 'support',
      });
    const login = await apiAgent(app)
      .post('/v1/admin/auth/login')
      .send({ email, password: PASSWORD });
    supportToken = (login.body as { accessToken: string }).accessToken;

    const signup = await apiAgent(app)
      .post('/v1/auth/signup')
      .send({
        name: 'Owner',
        email: `overview-owner-${runId}@example.com`,
        password: 'password-1234',
        restaurantName: `Overview Cafe ${runId}`,
        country: 'SA',
        timezone: 'Asia/Riyadh',
        currency: 'SAR',
        defaultLocale: 'en',
      });
    expect(signup.status).toBe(201);
    const body = signup.body as { accessToken: string; org: { id: string } };
    tenantToken = body.accessToken;
    orgId = body.org.id;
  });

  afterAll(async () => {
    await ownerPool.end();
    await app.close();
  });

  it('rejects anonymous callers and tenant tokens', async () => {
    expect((await apiAgent(app).get('/v1/admin/overview')).status).toBe(401);
    expect((await withBearer(apiAgent(app), tenantToken).get('/v1/admin/overview')).status).toBe(
      401,
    );
  });

  it('returns a well-formed overview with every status present', async () => {
    const body = await get();
    expect(Object.keys(body.orgsByStatus).sort()).toEqual([
      'active',
      'cancelled',
      'past_due',
      'suspended',
      'trial',
    ]);
    expect(body.orgsTotal).toBe(Object.values(body.orgsByStatus).reduce((a, b) => a + b, 0));
    expect(body.activeSubscriptions).toBe(body.planMix.reduce((s, r) => s + r.subscriptions, 0));
  });

  it('reflects status, subscription and order changes', async () => {
    const before = await get();

    await adminDb
      .update(organizations)
      .set({ status: 'suspended' })
      .where(eq(organizations.id, orgId));
    await asOrg(
      `UPDATE subscriptions SET status = 'active', provider = 'paddle', branch_quantity = 3 WHERE org_id = $1::uuid`,
      [orgId],
    );
    const [branch] = await adminDb
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.orgId, orgId))
      .limit(1);
    const [member] = await adminDb
      .select({ id: memberships.id })
      .from(memberships)
      .where(eq(memberships.orgId, orgId))
      .limit(1);
    await asOrg(
      `INSERT INTO orders (id, org_id, branch_id, client_order_id, order_number, business_date, type, status,
         payment_status, subtotal_minor, discount_minor, tax_minor, total_minor, currency, version, placed_at,
         created_by)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 1, current_date, 'takeaway', 'placed', 'unpaid',
         1000, 0, 0, 1000, 'SAR', 1, now(), $5::uuid)`,
      [newUuidV7(), orgId, branch?.id, newUuidV7(), member?.id],
    );

    const after = await get();
    expect(after.orgsByStatus.suspended).toBe(before.orgsByStatus.suspended + 1);
    expect(after.orgsTotal).toBe(before.orgsTotal);
    expect(after.orders24h).toBe(before.orders24h + 1);
    expect(after.activeOrgs24h).toBe(before.activeOrgs24h + 1);

    const sumMinor = (o: AdminOverview) => o.planMix.reduce((s, r) => s + r.mrrMinor, 0);
    expect(after.activeSubscriptions).toBe(before.activeSubscriptions + 1);
    expect(sumMinor(after)).toBeGreaterThan(sumMinor(before));
  });

  it('counts recent cancellations as churn but ignores old ones', async () => {
    const before = await get();
    await asOrg(
      `UPDATE subscriptions SET status = 'canceled', canceled_at = now() WHERE org_id = $1::uuid`,
      [orgId],
    );
    const recent = await get();
    expect(recent.churned30d).toBe(before.churned30d + 1);
    expect(recent.churnRate30d).toBeGreaterThan(0);

    await asOrg(
      `UPDATE subscriptions SET canceled_at = now() - interval '45 days' WHERE org_id = $1::uuid`,
      [orgId],
    );
    const old = await get();
    expect(old.churned30d).toBe(before.churned30d);
  });

  it('counts a manual grant at its recorded payment, and only while it lasts', async () => {
    const grant = (paid: boolean | null, amountMinor: number | null, periodEnd: string) =>
      asOrg(
        `UPDATE subscriptions
         SET plan_id = (SELECT id FROM plans WHERE key = 'restaurant'), status = 'active', provider = NULL,
             canceled_at = NULL, branch_quantity = 2, manual_paid = $2, manual_amount_minor = $3,
             current_period_end = $4::timestamptz
         WHERE org_id = $1::uuid`,
        [orgId, paid, amountMinor, periodEnd],
      );
    const totalMrr = async () => (await get()).planMix.reduce((s, r) => s + r.mrrMinor, 0);
    const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();

    await grant(false, 0, future);
    const unpaid = await totalMrr();
    await grant(null, null, future);
    expect(await totalMrr()).toBe(unpaid);
    await grant(true, 5000, past);
    expect(await totalMrr()).toBe(unpaid);
    await grant(true, 5000, future);
    expect(await totalMrr()).toBe(unpaid + 5000);
  });
});
