import type { LoginResponse } from '@app/shared';
import { eq } from 'drizzle-orm';
import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';
import sharp from 'sharp';
import { Test } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { CLOCK, type Clock } from '../src/core/clock/clock.tokens';
import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { outboxEvents } from '../src/core/db/schema/infra';
import { memberships } from '../src/core/db/schema/tenancy';
import { withOrg } from '../src/core/db/with-org';
import { JwtAccessService } from '../src/core/auth/jwt.service';
import { newUuidV7 } from '../src/lib/uuid';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import { loadEnv } from '../src/config/env';
import * as schema from '../src/core/db/schema/index';
import type { WorkerDrizzleDb } from '../src/core/db/worker-db.module';
import { createTestApp } from './create-test-app';
import { apiAgent, withBearer } from './http';
import { extractInviteToken, signupFreshOrg } from './staff-settings-helpers';

type ApiError = { error: { code?: string; message: string } };

class MutableClock implements Clock {
  constructor(private at: Date) {}

  set(at: Date): void {
    this.at = at;
  }

  now(): Date {
    return this.at;
  }
}

describe('Staff and settings (e2e)', () => {
  let app: INestApplication;
  let publicAgent: Agent;
  let appDb: DrizzleDb;
  let workerDb: WorkerDrizzleDb;
  let workerPool: pg.Pool;
  let jwt: JwtAccessService;

  beforeAll(async () => {
    const ctx = await createTestApp({ WEB_APP_URL: 'http://localhost:5173' });
    app = ctx.app;
    publicAgent = apiAgent(app);
    appDb = app.get(DRIZZLE);
    const env = loadEnv({ WEB_APP_URL: 'http://localhost:5173' });
    workerPool = new pg.Pool({ connectionString: env.DATABASE_WORKER_URL });
    workerDb = drizzle(workerPool, { schema });
    jwt = app.get(JwtAccessService);
  });

  afterAll(async () => {
    await app.close();
    await workerPool.end();
  }, 30_000);

  describe('org settings', () => {
    it('owner GET/PATCH works; slug extra keys rejected', async () => {
      const fresh = await signupFreshOrg(app, jwt);
      const get = await fresh.ownerAgent.get('/v1/org/settings');
      expect(get.status).toBe(200);

      const patch = await fresh.ownerAgent.patch('/v1/org/settings').send({ name: 'Renamed Org' });
      expect(patch.status).toBe(200);
      expect((patch.body as { name: string }).name).toBe('Renamed Org');

      const strict = await fresh.ownerAgent.patch('/v1/org/settings').send({ slug: 'hacked' });
      expect(strict.status).toBe(400);

      const currency = await fresh.ownerAgent
        .patch('/v1/org/settings')
        .send({ defaultCurrency: 'USD' });
      expect(currency.status).toBe(400);
    });

    it('manager and cashier get 403 on org settings', async () => {
      const fresh = await signupFreshOrg(app, jwt);
      const managerEmail = `mgr-${newUuidV7().slice(-8)}@example.com`;
      const invite = await fresh.ownerAgent.post('/v1/staff/invites').send({
        email: managerEmail,
        roleKey: 'manager',
        allBranches: true,
        branchIds: [],
      });
      expect(invite.status).toBe(201);
      const token = extractInviteToken((invite.body as { inviteUrl: string }).inviteUrl);
      await publicAgent.post('/v1/auth/accept-invite').send({
        token,
        password: fresh.password,
        name: 'Manager',
      });
      const managerLogin = await publicAgent.post('/v1/auth/login').send({
        email: managerEmail,
        password: fresh.password,
      });
      const managerToken = (managerLogin.body as { accessToken: string }).accessToken;
      const manager = withBearer(apiAgent(app), managerToken);

      expect((await manager.get('/v1/org/settings')).status).toBe(403);

      const cashierEmail = `csh-${newUuidV7().slice(-8)}@example.com`;
      const cInvite = await fresh.ownerAgent.post('/v1/staff/invites').send({
        email: cashierEmail,
        roleKey: 'cashier',
        allBranches: true,
        branchIds: [],
      });
      const cToken = extractInviteToken((cInvite.body as { inviteUrl: string }).inviteUrl);
      await publicAgent.post('/v1/auth/accept-invite').send({ token: cToken, password: fresh.password });
      const cashierLogin = await publicAgent.post('/v1/auth/login').send({
        email: cashierEmail,
        password: fresh.password,
      });
      const cashier = withBearer(apiAgent(app), (cashierLogin.body as { accessToken: string }).accessToken);
      expect((await cashier.get('/v1/org/settings')).status).toBe(403);
    });

    it('rejects empty locales and defaultLocale not in locales', async () => {
      const fresh = await signupFreshOrg(app, jwt);
      const empty = await fresh.ownerAgent.patch('/v1/org/settings').send({ locales: [] });
      expect(empty.status).toBe(400);

      const badDefault = await fresh.ownerAgent
        .patch('/v1/org/settings')
        .send({ locales: ['en'], defaultLocale: 'ar' });
      expect(badDefault.status).toBe(400);
    });
  });

  describe('org logo', () => {
    it('upload png sets logoUrl on settings and me; delete clears', async () => {
      const fresh = await signupFreshOrg(app, jwt);
      const png = await sharp({
        create: { width: 64, height: 64, channels: 3, background: '#abc' },
      })
        .png()
        .toBuffer();

      const up = await fresh.ownerAgent
        .post('/v1/org/logo')
        .attach('file', png, { filename: 'logo.png', contentType: 'image/png' });
      expect(up.status).toBe(201);
      const logoUrl = (up.body as { logoUrl: string }).logoUrl;
      expect(logoUrl.length).toBeGreaterThan(0);

      const settings = await fresh.ownerAgent.get('/v1/org/settings');
      expect((settings.body as { logoUrl: string }).logoUrl).toBe(logoUrl);

      const me = await fresh.ownerAgent.get('/v1/me');
      expect((me.body as { org: { logoUrl: string } }).org.logoUrl).toBe(logoUrl);

      const del = await fresh.ownerAgent.delete('/v1/org/logo');
      expect(del.status).toBe(200);
      expect((del.body as { logoUrl: null }).logoUrl).toBeNull();
    });

    it('rejects non-image and oversized file', async () => {
      const fresh = await signupFreshOrg(app, jwt);
      const bad = await fresh.ownerAgent
        .post('/v1/org/logo')
        .attach('file', Buffer.from('not an image'), { filename: 'x.bin' });
      expect(bad.status).toBe(400);

      const big = Buffer.alloc(5 * 1024 * 1024 + 1, 1);
      const huge = await fresh.ownerAgent
        .post('/v1/org/logo')
        .attach('file', big, { filename: 'big.png', contentType: 'image/png' });
      expect(huge.status).toBe(400);
    });
  });

  describe('branch settings fields', () => {
    it('round-trips address and receipt fields; empty string becomes null', async () => {
      const fresh = await signupFreshOrg(app, jwt);
      const patch = await fresh.ownerAgent.patch(`/v1/branches/${fresh.branchId}`).send({
        address: '123 Main',
        receiptHeader: 'Welcome',
        receiptFooter: 'Thanks',
      });
      expect(patch.status).toBe(200);

      const list = await fresh.ownerAgent.get('/v1/branches');
      const branch = (list.body as { items: Array<{ id: string; address: string | null }> }).items.find(
        (b) => b.id === fresh.branchId,
      );
      expect(branch?.address).toBe('123 Main');

      const clear = await fresh.ownerAgent.patch(`/v1/branches/${fresh.branchId}`).send({
        receiptFooter: '   ',
      });
      expect(clear.status).toBe(200);
      expect((clear.body as { receiptFooter: string | null }).receiptFooter).toBeNull();
    });

    it('rejects invalid timezone, long receipt, dayStartHour 24', async () => {
      const fresh = await signupFreshOrg(app, jwt);
      expect(
        (await fresh.ownerAgent.patch(`/v1/branches/${fresh.branchId}`).send({ timezone: 'Not/A/Zone' }))
          .status,
      ).toBe(400);

      const long = 'x'.repeat(501);
      expect(
        (await fresh.ownerAgent.patch(`/v1/branches/${fresh.branchId}`).send({ receiptHeader: long }))
          .status,
      ).toBe(400);

      expect(
        (await fresh.ownerAgent.patch(`/v1/branches/${fresh.branchId}`).send({ dayStartHour: 24 }))
          .status,
      ).toBe(400);
    });

    it('writes branch.settings_updated outbox row on PATCH', async () => {
      const fresh = await signupFreshOrg(app, jwt);
      const before = await workerDb
        .select()
        .from(outboxEvents)
        .where(eq(outboxEvents.orgId, fresh.orgId));
      const beforeCount = before.length;

      await fresh.ownerAgent.patch(`/v1/branches/${fresh.branchId}`).send({ address: 'Outbox St' });

      const after = await workerDb
        .select()
        .from(outboxEvents)
        .where(eq(outboxEvents.orgId, fresh.orgId));
      expect(after.length).toBeGreaterThan(beforeCount);
      const latest = after[after.length - 1];
      expect(latest?.type).toBe('branch.settings_updated');
      expect(latest?.branchId).toBe(fresh.branchId);
    });
  });

  describe('staff list and invites', () => {
    it('lists staff without secrets; pin-only has null email; isSelf', async () => {
      const fresh = await signupFreshOrg(app, jwt);
      await fresh.ownerAgent.post('/v1/staff/pin-only').send({
        name: 'PIN Cashier',
        roleKey: 'cashier',
        allBranches: true,
        branchIds: [],
        pin: '4444',
      });

      const list = await fresh.ownerAgent.get('/v1/staff');
      expect(list.status).toBe(200);
      const bodyStr = JSON.stringify(list.body);
      expect(bodyStr.includes('invite_token')).toBe(false);
      expect(bodyStr.includes('pin_hash')).toBe(false);

      const pinRow = (list.body as { items: Array<{ name: string; email: string | null; isSelf: boolean }> }).items.find(
        (i) => i.name === 'PIN Cashier',
      );
      expect(pinRow?.email).toBeNull();

      const self = (list.body as { items: Array<{ isSelf: boolean; roleKey: string }> }).items.find(
        (i) => i.isSelf,
      );
      expect(self?.roleKey).toBe('owner');
    });

    it('invite flow: create, 409 duplicate, accept new user, wrong password stays invited, expiry, regenerate, revoke', async () => {
      const fresh = await signupFreshOrg(app, jwt);
      const email = `inv-${newUuidV7().slice(-8)}@example.com`;
      const created = await fresh.ownerAgent.post('/v1/staff/invites').send({
        email,
        roleKey: 'cashier',
        allBranches: true,
        branchIds: [],
      });
      expect(created.status).toBe(201);
      const inviteUrl = (created.body as { inviteUrl: string }).inviteUrl;
      const token = extractInviteToken(inviteUrl);

      const preview = await publicAgent.get(`/v1/auth/invites/${token}`);
      expect(preview.status).toBe(200);
      expect((preview.body as { orgName: string; roleKey: string }).orgName.length).toBeGreaterThan(0);
      expect((preview.body as { roleKey: string }).roleKey).toBe('cashier');

      const dup = await fresh.ownerAgent.post('/v1/staff/invites').send({
        email,
        roleKey: 'cashier',
        allBranches: true,
        branchIds: [],
      });
      expect(dup.status).toBe(409);
      expect((dup.body as ApiError).error.code).toBe('STAFF_ALREADY_MEMBER');

      const accept = await publicAgent.post('/v1/auth/accept-invite').send({
        token,
        password: 'new-password-99',
        name: 'Invited User',
      });
      expect([200, 201]).toContain(accept.status);
      const me = await withBearer(apiAgent(app), (accept.body as { accessToken: string }).accessToken).get('/v1/me');
      expect(me.status).toBe(200);

      const existingUserOrg = await signupFreshOrg(app, jwt);
      const existingInvite = await fresh.ownerAgent.post('/v1/staff/invites').send({
        email: existingUserOrg.ownerEmail,
        roleKey: 'cashier',
        allBranches: true,
        branchIds: [],
      });
      const membershipId = (existingInvite.body as { membershipId: string }).membershipId;
      const tokenExisting = extractInviteToken(
        (existingInvite.body as { inviteUrl: string }).inviteUrl,
      );
      const wrong = await publicAgent.post('/v1/auth/accept-invite').send({
        token: tokenExisting,
        password: 'wrong-password-xxx',
      });
      expect(wrong.status).toBe(401);
      const stillInvited = await withOrg(appDb, fresh.orgId, async (tx) => {
        const row = await tx.select().from(memberships).where(eq(memberships.id, membershipId)).limit(1);
        return row[0]?.status;
      });
      expect(stillInvited).toBe('invited');

      const regen = await fresh.ownerAgent.post(`/v1/staff/${membershipId}/invite/regenerate`);
      expect(regen.status).toBe(201);
      const oldPreview = await publicAgent.get(`/v1/auth/invites/${tokenExisting}`);
      expect(oldPreview.status).toBe(404);

      await fresh.ownerAgent.delete(`/v1/staff/${membershipId}/invite`);
      const afterRevoke = await publicAgent.get(
        `/v1/auth/invites/${extractInviteToken((regen.body as { inviteUrl: string }).inviteUrl)}`,
      );
      expect(afterRevoke.status).toBe(404);
    });

    it('expired invite returns 410 with test clock', async () => {
      const clock = new MutableClock(new Date('2026-06-01T12:00:00.000Z'));
      const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(CLOCK)
        .useValue(clock)
        .compile();
      const clockApp = moduleRef.createNestApplication();
      await clockApp.init();
      const clockAgent = apiAgent(clockApp);
      const clockJwt = clockApp.get(JwtAccessService);

      const fresh = await signupFreshOrg(clockApp, clockJwt);
      const email = `exp-${newUuidV7().slice(-8)}@example.com`;
      const created = await fresh.ownerAgent.post('/v1/staff/invites').send({
        email,
        roleKey: 'cashier',
        allBranches: true,
        branchIds: [],
      });
      const token = extractInviteToken((created.body as { inviteUrl: string }).inviteUrl);

      clock.set(new Date('2026-06-10T12:00:00.000Z'));
      const preview = await clockAgent.get(`/v1/auth/invites/${token}`);
      expect(preview.status).toBe(410);
      expect((preview.body as ApiError).error.code).toBe('INVITE_EXPIRED');

      await clockApp.close();
    });
  });

  describe('staff rules and PIN', () => {
    it('manager cannot invite manager; cannot patch owner; self-disable forbidden; last owner protected', async () => {
      const fresh = await signupFreshOrg(app, jwt);
      const managerEmail = `mgr2-${newUuidV7().slice(-8)}@example.com`;
      const inv = await fresh.ownerAgent.post('/v1/staff/invites').send({
        email: managerEmail,
        roleKey: 'manager',
        allBranches: true,
        branchIds: [],
      });
      const mToken = extractInviteToken((inv.body as { inviteUrl: string }).inviteUrl);
      await publicAgent.post('/v1/auth/accept-invite').send({ token: mToken, password: fresh.password });
      const managerLogin = await publicAgent.post('/v1/auth/login').send({
        email: managerEmail,
        password: fresh.password,
      });
      const manager = withBearer(apiAgent(app), (managerLogin.body as { accessToken: string }).accessToken);

      expect(
        (
          await manager.post('/v1/staff/invites').send({
            email: `x-${newUuidV7().slice(-8)}@example.com`,
            roleKey: 'manager',
            allBranches: true,
            branchIds: [],
          })
        ).status,
      ).toBe(403);

      expect(
        (
          await manager.post('/v1/staff/invites').send({
            email: `owner-inv-${newUuidV7().slice(-8)}@example.com`,
            roleKey: 'owner',
            allBranches: true,
            branchIds: [],
          })
        ).status,
      ).toBe(403);

      const ownerRow = (
        (await fresh.ownerAgent.get('/v1/staff')).body as { items: Array<{ roleKey: string; id: string }> }
      ).items.find((i) => i.roleKey === 'owner');
      expect(
        (await manager.patch(`/v1/staff/${ownerRow?.id ?? ''}`).send({ status: 'disabled' })).status,
      ).toBe(403);

      const managerRow = (
        (await manager.get('/v1/staff')).body as { items: Array<{ id: string; isSelf: boolean }> }
      ).items.find((i) => i.isSelf);
      expect(
        (await manager.patch(`/v1/staff/${managerRow?.id ?? ''}`).send({ status: 'disabled' })).status,
      ).toBe(403);

      const demote = await fresh.ownerAgent
        .patch(`/v1/staff/${ownerRow?.id ?? ''}`)
        .send({ roleKey: 'manager' });
      expect(demote.status).toBe(403);
    });

    it('branch-limited manager cannot PATCH self to allBranches', async () => {
      const fresh = await signupFreshOrg(app, jwt);
      const managerEmail = `mgr-br-${newUuidV7().slice(-8)}@example.com`;
      const inv = await fresh.ownerAgent.post('/v1/staff/invites').send({
        email: managerEmail,
        roleKey: 'manager',
        allBranches: false,
        branchIds: [fresh.branchId],
      });
      const mToken = extractInviteToken((inv.body as { inviteUrl: string }).inviteUrl);
      await publicAgent.post('/v1/auth/accept-invite').send({ token: mToken, password: fresh.password });
      const managerLogin = await publicAgent.post('/v1/auth/login').send({
        email: managerEmail,
        password: fresh.password,
      });
      const manager = withBearer(apiAgent(app), (managerLogin.body as { accessToken: string }).accessToken);

      const beforeList = (await manager.get('/v1/staff')).body as {
        items: Array<{ isSelf: boolean; id: string; allBranches: boolean; branchIds: string[] }>;
      };
      const selfRow = beforeList.items.find((i) => i.isSelf);
      expect(selfRow?.allBranches).toBe(false);
      expect(selfRow?.branchIds).toEqual([fresh.branchId]);

      expect(
        (await manager.patch(`/v1/staff/${selfRow?.id ?? ''}`).send({ allBranches: true })).status,
      ).toBe(403);

      const afterList = (await manager.get('/v1/staff')).body as {
        items: Array<{ isSelf: boolean; allBranches: boolean; branchIds: string[] }>;
      };
      const afterSelf = afterList.items.find((i) => i.isSelf);
      expect(afterSelf?.allBranches).toBe(false);
      expect(afterSelf?.branchIds).toEqual([fresh.branchId]);
    });

    it('rejects branchIds from another org on invite', async () => {
      const fresh = await signupFreshOrg(app, jwt);
      const other = await signupFreshOrg(app, jwt);
      const bad = await fresh.ownerAgent.post('/v1/staff/invites').send({
        email: `br-${newUuidV7().slice(-8)}@example.com`,
        roleKey: 'cashier',
        allBranches: false,
        branchIds: [other.branchId],
      });
      expect([400, 404]).toContain(bad.status);
    });

    it('disabling member invalidates access token', async () => {
      const fresh = await signupFreshOrg(app, jwt);
      const email = `dis-${newUuidV7().slice(-8)}@example.com`;
      const inv = await fresh.ownerAgent.post('/v1/staff/invites').send({
        email,
        roleKey: 'cashier',
        allBranches: true,
        branchIds: [],
      });
      const token = extractInviteToken((inv.body as { inviteUrl: string }).inviteUrl);
      const accepted = await publicAgent.post('/v1/auth/accept-invite').send({
        token,
        password: 'disable-me-12345',
      });
      const memberToken = (accepted.body as { accessToken: string }).accessToken;
      const memberId = (
        (await fresh.ownerAgent.get('/v1/staff')).body as {
          items: Array<{ email: string | null; id: string }>;
        }
      ).items.find((i) => i.email === email)?.id;

      await fresh.ownerAgent.patch(`/v1/staff/${memberId ?? ''}`).send({ status: 'disabled' });
      expect((await withBearer(apiAgent(app), memberToken).get('/v1/me')).status).toBe(401);
    });

    it('validates PIN format; self can set; cashier cannot set other PIN', async () => {
      const fresh = await signupFreshOrg(app, jwt);
      const ownerRow = (
        (await fresh.ownerAgent.get('/v1/staff')).body as { items: Array<{ isSelf: boolean; id: string }> }
      ).items.find((i) => i.isSelf);

      expect(
        (await fresh.ownerAgent.put(`/v1/staff/${ownerRow?.id ?? ''}/pin`).send({ pin: '123' })).status,
      ).toBe(400);
      expect(
        (await fresh.ownerAgent.put(`/v1/staff/${ownerRow?.id ?? ''}/pin`).send({ pin: '1234567' })).status,
      ).toBe(400);
      expect(
        (await fresh.ownerAgent.put(`/v1/staff/${ownerRow?.id ?? ''}/pin`).send({ pin: 'abcd' })).status,
      ).toBe(400);

      expect(
        (await fresh.ownerAgent.put(`/v1/staff/${ownerRow?.id ?? ''}/pin`).send({ pin: '1111' })).status,
      ).toBe(200);

      const cashierEmail = `pin-${newUuidV7().slice(-8)}@example.com`;
      const inv = await fresh.ownerAgent.post('/v1/staff/invites').send({
        email: cashierEmail,
        roleKey: 'cashier',
        allBranches: true,
        branchIds: [],
      });
      const cToken = extractInviteToken((inv.body as { inviteUrl: string }).inviteUrl);
      await publicAgent.post('/v1/auth/accept-invite').send({ token: cToken, password: fresh.password });
      const loginRes = await publicAgent
        .post('/v1/auth/login')
        .send({ email: cashierEmail, password: fresh.password });
      const cashierToken = (loginRes.body as LoginResponse).accessToken;
      const cashier = withBearer(apiAgent(app), cashierToken);
      expect(
        (await cashier.put(`/v1/staff/${ownerRow?.id ?? ''}/pin`).send({ pin: '2222' })).status,
      ).toBe(403);
    });
  });

  describe('tenant isolation', () => {
    it('cannot read or mutate other org staff/settings', async () => {
      const a = await signupFreshOrg(app, jwt);
      const b = await signupFreshOrg(app, jwt);

      expect((await a.ownerAgent.get('/v1/org/settings')).status).toBe(200);
      expect((await a.ownerAgent.patch(`/v1/branches/${b.branchId}`).send({ name: 'Hack' })).status).toBe(404);

      const bStaff = await b.ownerAgent.get('/v1/staff');
      const bMemberId = (bStaff.body as { items: Array<{ id: string }> }).items[0]?.id ?? '';
      expect((await a.ownerAgent.patch(`/v1/staff/${bMemberId}`).send({ status: 'disabled' })).status).toBe(
        404,
      );
    });
  });
});
