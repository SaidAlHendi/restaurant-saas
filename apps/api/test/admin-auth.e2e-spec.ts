import { type INestApplication, Controller, Get, Module, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import { loadEnv, resetEnvCacheForTests } from '../src/config/env';
import { Public } from '../src/core/auth/public.decorator';
import { ADMIN_DRIZZLE, type AdminDrizzleDb } from '../src/core/db/admin-db.tokens';
import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { adminUsers, auditLogs } from '../src/core/db/schema/admin';
import { organizations } from '../src/core/db/schema/tenancy';
import { newUuidV7 } from '../src/lib/uuid';
import { AppModule } from '../src/app.module';
import { AdminAuthGuard } from '../src/modules/admin/admin-auth.guard';
import { AdminModule } from '../src/modules/admin/admin.module';
import { WithAdminService } from '../src/modules/admin/with-admin.service';
import { RequireAdminRole } from '../src/modules/admin/require-admin-role.decorator';

import { apiAgent, withBearer } from './http';

/** Stand-in for step-5 suspend routes, to prove role gating before they exist. */
@Public()
@UseGuards(AdminAuthGuard)
@Controller('v1/admin/_test')
class RoleProbeController {
  @Get('support')
  support() {
    return { ok: true };
  }

  @RequireAdminRole('super')
  @Get('super-only')
  superOnly() {
    return { ok: true };
  }
}

@Module({ imports: [AdminModule], controllers: [RoleProbeController] })
class RoleProbeModule {}

const PASSWORD = 'correct-horse-battery-staple';
const runId = String(Date.now());

function cookieValue(setCookie: string[] | string | undefined, name: string): string | undefined {
  const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const line = list.find((c) => c.startsWith(`${name}=`));
  return line?.split(';')[0]?.slice(name.length + 1);
}

describe('Admin auth and admin database role (e2e)', () => {
  let app: INestApplication;
  let adminDb: AdminDrizzleDb;
  let tenantDb: DrizzleDb;
  let ownerPool: pg.Pool;
  const created: Record<'super' | 'support' | 'inactive', { id: string; email: string }> = {
    super: { id: newUuidV7(), email: `super-${runId}@admin.test` },
    support: { id: newUuidV7(), email: `support-${runId}@admin.test` },
    inactive: { id: newUuidV7(), email: `inactive-${runId}@admin.test` },
  };

  beforeAll(async () => {
    resetEnvCacheForTests();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, RoleProbeModule],
    }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    app.use(cookieParser());
    await app.init();
    adminDb = app.get<AdminDrizzleDb>(ADMIN_DRIZZLE);
    tenantDb = app.get<DrizzleDb>(DRIZZLE);

    // Admin users are created out of band (CLI), so insert them the way the CLI does: as app_owner.
    ownerPool = new pg.Pool({ connectionString: loadEnv().DATABASE_MIGRATION_URL });
    const ownerDb = drizzle(ownerPool);
    const passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });
    await ownerDb.insert(adminUsers).values([
      { ...created.super, passwordHash, name: 'Super Admin', role: 'super' },
      { ...created.support, passwordHash, name: 'Support Admin', role: 'support' },
      { ...created.inactive, passwordHash, name: 'Inactive', role: 'support', isActive: false },
    ]);
  });

  afterAll(async () => {
    await ownerPool.end();
    await app.close();
  });

  async function adminLogin(email = created.super.email, password = PASSWORD) {
    const agent = apiAgent(app);
    const res = await agent.post('/v1/admin/auth/login').send({ email, password });
    return { agent, res };
  }

  describe('login, me, refresh, logout', () => {
    it('logs in, sets a path-scoped httpOnly cookie, returns an admin token and audits it', async () => {
      const { res } = await adminLogin();
      expect(res.status).toBe(201);
      const body = res.body as { accessToken: string; admin: { email: string; role: string } };
      expect(body.admin).toMatchObject({ email: created.super.email, role: 'super' });
      const cookie = (res.headers['set-cookie'] as unknown as string[]).find((c) =>
        c.startsWith('admin_rt='),
      );
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Path=/v1/admin/auth');
      expect(cookie).not.toContain('refresh_token');

      const audit = await adminDb
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.adminUserId, created.super.id));
      expect(audit.some((a) => a.action === 'admin.login')).toBe(true);
    });

    it('rejects unknown email, wrong password and deactivated admin with the same error', async () => {
      const unknown = await adminLogin(`nobody-${runId}@admin.test`, PASSWORD);
      const wrong = await adminLogin(created.super.email, 'wrong-password-123');
      const inactive = await adminLogin(created.inactive.email, PASSWORD);
      for (const r of [unknown.res, wrong.res, inactive.res]) {
        expect(r.status).toBe(401);
      }
      expect(unknown.res.body).toEqual(wrong.res.body);
      expect(inactive.res.body).toEqual(wrong.res.body);
    });

    it('GET /v1/admin/me needs a token and returns the admin', async () => {
      const anon = await apiAgent(app).get('/v1/admin/me');
      expect(anon.status).toBe(401);
      const { res } = await adminLogin();
      const token = (res.body as { accessToken: string }).accessToken;
      const me = await withBearer(apiAgent(app), token).get('/v1/admin/me');
      expect(me.status).toBe(200);
      expect((me.body as { admin: { id: string } }).admin.id).toBe(created.super.id);
      const alias = await withBearer(apiAgent(app), token).get('/v1/admin/auth/me');
      expect(alias.status).toBe(200);
    });

    it('rotates the refresh token and detects reuse of a rotated token', async () => {
      const { res } = await adminLogin();
      const first = cookieValue(res.headers['set-cookie'], 'admin_rt') ?? '';
      const refreshed = await apiAgent(app)
        .post('/v1/admin/auth/refresh')
        .set('Cookie', `admin_rt=${first}`);
      expect(refreshed.status).toBe(201);
      const second = cookieValue(refreshed.headers['set-cookie'], 'admin_rt') ?? '';
      expect(second).not.toBe(first);

      const reuse = await apiAgent(app)
        .post('/v1/admin/auth/refresh')
        .set('Cookie', `admin_rt=${first}`);
      expect(reuse.status).toBe(401);
      // Reuse revokes the whole family, including the newest token.
      const afterReuse = await apiAgent(app)
        .post('/v1/admin/auth/refresh')
        .set('Cookie', `admin_rt=${second}`);
      expect(afterReuse.status).toBe(401);
    });

    it('logout revokes the session: refresh and the access token stop working', async () => {
      const { res } = await adminLogin();
      const token = (res.body as { accessToken: string }).accessToken;
      const raw = cookieValue(res.headers['set-cookie'], 'admin_rt') ?? '';
      const out = await apiAgent(app).post('/v1/admin/auth/logout').set('Cookie', `admin_rt=${raw}`);
      expect(out.status).toBe(201);
      const refresh = await apiAgent(app)
        .post('/v1/admin/auth/refresh')
        .set('Cookie', `admin_rt=${raw}`);
      expect(refresh.status).toBe(401);
      const me = await withBearer(apiAgent(app), token).get('/v1/admin/me');
      expect(me.status).toBe(401);
    });

    it('deactivating an admin cuts off an already issued access token', async () => {
      const email = `deactivate-${runId}@admin.test`;
      const id = newUuidV7();
      await drizzle(ownerPool)
        .insert(adminUsers)
        .values({
          id,
          email,
          passwordHash: await argon2.hash(PASSWORD, { type: argon2.argon2id }),
          name: 'Temp',
          role: 'support',
        });
      const { res } = await adminLogin(email);
      const token = (res.body as { accessToken: string }).accessToken;
      expect((await withBearer(apiAgent(app), token).get('/v1/admin/me')).status).toBe(200);
      await ownerPool.query('UPDATE admin_users SET is_active = false WHERE id = $1', [id]);
      expect((await withBearer(apiAgent(app), token).get('/v1/admin/me')).status).toBe(401);
    });
  });

  describe('token planes are isolated', () => {
    it('a tenant access token is rejected by the admin guard', async () => {
      const tenant = await apiAgent(app)
        .post('/v1/auth/login')
        .send({ email: 'owner@demo.local', password: loadEnv().SEED_PASSWORD ?? 'seed-password-123456' });
      expect(tenant.status).toBe(201);
      const token = (tenant.body as { accessToken: string }).accessToken;
      const res = await withBearer(apiAgent(app), token).get('/v1/admin/me');
      expect(res.status).toBe(401);
    });

    it('an admin access token is rejected by tenant routes', async () => {
      const { res } = await adminLogin();
      const token = (res.body as { accessToken: string }).accessToken;
      const me = await withBearer(apiAgent(app), token).get('/v1/me');
      expect(me.status).toBe(401);
      const refresh = await apiAgent(app)
        .post('/v1/auth/refresh')
        .set('Cookie', `refresh_token=${cookieValue(res.headers['set-cookie'], 'admin_rt') ?? ''}`);
      expect(refresh.status).toBe(401);
    });
  });

  describe('role gating', () => {
    it('support can reach support routes but not super-only routes; super can reach both', async () => {
      const support = await adminLogin(created.support.email);
      const supportToken = (support.res.body as { accessToken: string }).accessToken;
      expect((await withBearer(apiAgent(app), supportToken).get('/v1/admin/_test/support')).status).toBe(200);
      const denied = await withBearer(apiAgent(app), supportToken).get('/v1/admin/_test/super-only');
      expect(denied.status).toBe(403);

      const superAdmin = await adminLogin(created.super.email);
      const superToken = (superAdmin.res.body as { accessToken: string }).accessToken;
      expect((await withBearer(apiAgent(app), superToken).get('/v1/admin/_test/super-only')).status).toBe(200);
    });
  });

  describe('app_admin database role', () => {
    it('is BYPASSRLS, not superuser', async () => {
      const r = await adminDb.execute(
        sql`SELECT rolsuper AS super, rolbypassrls AS bypass, current_user AS who FROM pg_roles WHERE rolname = current_user`,
      );
      expect(r.rows[0]).toMatchObject({ super: false, bypass: true, who: 'app_admin' });
    });

    it('reads across tenants without setting app.org_id', async () => {
      const orgs = await adminDb.select({ id: organizations.id }).from(organizations);
      expect(orgs.length).toBeGreaterThanOrEqual(2);
      // The tenant pool sees nothing without an org context.
      const tenantView = await tenantDb.select({ id: organizations.id }).from(organizations);
      expect(tenantView).toHaveLength(0);
    });

    it('cannot read password hashes, delete rows or rewrite audit logs', async () => {
      await expect(adminDb.execute(sql`SELECT password_hash FROM users LIMIT 1`)).rejects.toThrow();
      await expect(adminDb.execute(sql`SELECT * FROM users LIMIT 1`)).rejects.toThrow();
      await expect(adminDb.execute(sql`DELETE FROM organizations WHERE false`)).rejects.toThrow();
      await expect(adminDb.execute(sql`UPDATE audit_logs SET action = 'x' WHERE false`)).rejects.toThrow();
      await expect(adminDb.execute(sql`DELETE FROM audit_logs WHERE false`)).rejects.toThrow();
      await expect(adminDb.execute(sql`UPDATE users SET name = 'x' WHERE false`)).rejects.toThrow();
      await expect(adminDb.execute(sql`UPDATE organizations SET name = 'x' WHERE false`)).rejects.toThrow();
    });

    it('can update organizations.status', async () => {
      await expect(
        adminDb.execute(sql`UPDATE organizations SET status = status WHERE false`),
      ).resolves.toBeDefined();
    });

    it('is the only runtime role that can touch admin tables', async () => {
      await expect(tenantDb.execute(sql`SELECT * FROM admin_users`)).rejects.toThrow();
      await expect(tenantDb.execute(sql`SELECT * FROM admin_sessions`)).rejects.toThrow();
      await expect(tenantDb.execute(sql`SELECT * FROM audit_logs`)).rejects.toThrow();
    });

    it('withAdmin writes the audit row with the change and rolls both back on failure', async () => {
      const withAdmin = app.get(WithAdminService);
      const actor = { adminUserId: created.super.id, role: 'super' as const };
      const action = `test.commit.${runId}`;
      await withAdmin.withAdmin(actor, { action, targetType: 'test', payload: { a: 1 } }, () =>
        Promise.resolve('ok'),
      );
      const written = await adminDb.select().from(auditLogs).where(eq(auditLogs.action, action));
      expect(written).toHaveLength(1);
      expect(written[0]?.payload).toEqual({ a: 1 });

      const failing = `test.rollback.${runId}`;
      await expect(
        withAdmin.withAdmin(actor, { action: failing }, () => Promise.reject(new Error('boom'))),
      ).rejects.toThrow('boom');
      expect(await adminDb.select().from(auditLogs).where(eq(auditLogs.action, failing))).toHaveLength(0);
    });
  });

  describe('suspended organizations are locked out of the tenant API', () => {
    async function signupOrg(tag: string) {
      const email = `susp-${tag}-${runId}@example.com`;
      const agent = apiAgent(app);
      const signup = await agent.post('/v1/auth/signup').send({
        name: 'Suspend Me',
        email,
        password: 'password-1234',
        restaurantName: `Suspend Cafe ${tag} ${runId}`,
        country: 'SA',
        timezone: 'Asia/Riyadh',
        currency: 'SAR',
        defaultLocale: 'en',
      });
      expect(signup.status).toBe(201);
      const body = signup.body as { accessToken: string; org: { id: string } };
      return { email, orgId: body.org.id, token: body.accessToken, signup };
    }

    function setStatus(orgId: string, status: 'active' | 'suspended' | 'cancelled') {
      return adminDb.update(organizations).set({ status }).where(eq(organizations.id, orgId));
    }

    it('rejects login, existing access tokens and refresh with a clear error code, and recovers on reactivation', async () => {
      const { email, orgId, token, signup } = await signupOrg('a');
      const refreshCookie = cookieValue(signup.headers['set-cookie'], 'refresh_token') ?? '';
      expect((await withBearer(apiAgent(app), token).get('/v1/me')).status).toBe(200);

      await setStatus(orgId, 'suspended');

      const me = await withBearer(apiAgent(app), token).get('/v1/me');
      expect(me.status).toBe(403);
      expect(JSON.stringify(me.body)).toContain('ORG_SUSPENDED');

      const login = await apiAgent(app).post('/v1/auth/login').send({ email, password: 'password-1234' });
      expect(login.status).toBe(403);
      expect(JSON.stringify(login.body)).toContain('ORG_SUSPENDED');

      const refresh = await apiAgent(app)
        .post('/v1/auth/refresh')
        .set('Cookie', `refresh_token=${refreshCookie}`);
      expect(refresh.status).toBe(403);
      expect(JSON.stringify(refresh.body)).toContain('ORG_SUSPENDED');

      await setStatus(orgId, 'active');
      expect((await withBearer(apiAgent(app), token).get('/v1/me')).status).toBe(200);
      const again = await apiAgent(app).post('/v1/auth/login').send({ email, password: 'password-1234' });
      expect(again.status).toBe(201);
    });

    it('rejects cancelled organizations with ORG_CANCELLED', async () => {
      const { email, orgId } = await signupOrg('b');
      await setStatus(orgId, 'cancelled');
      const login = await apiAgent(app).post('/v1/auth/login').send({ email, password: 'password-1234' });
      expect(login.status).toBe(403);
      expect(JSON.stringify(login.body)).toContain('ORG_CANCELLED');
    });
  });
});
