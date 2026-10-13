import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';

import { AppModule } from '../src/app.module';
import { loadEnv } from '../src/config/env';
import { CLOCK, type Clock } from '../src/core/clock/clock.tokens';
import { SocketIoRedisIoAdapter } from '../src/core/realtime/socket-io-redis.adapter';
import { JwtAccessService } from '../src/core/auth/jwt.service';
import { newUuidV7 } from '../src/lib/uuid';

import { createTestApp } from './create-test-app';
import { apiAgent, withBearer } from './http';
import {
  advanceOrderToPreparing,
  branchAgent,
  placePlacedOrder,
  setupFreshOrgWithPins,
} from './pin-approval-helpers';
import { extractInviteToken, signupFreshOrg } from './staff-settings-helpers';
import { postOrder } from './ordering-helpers';

type ApiError = { error: { code?: string; message: string; details?: Record<string, unknown> } };

class MutableClock implements Clock {
  constructor(private at: Date) {}

  set(at: Date): void {
    this.at = at;
  }

  now(): Date {
    return this.at;
  }
}

describe('PIN users, login, and cancel approval (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;
  let jwt: JwtAccessService;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
    jwt = app.get(JwtAccessService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('pin-users lists active PIN holders with branch access only', async () => {
    const fresh = await setupFreshOrgWithPins(app, jwt);
    const kitchen = branchAgent(app, fresh.kitchenToken, fresh.branchId);
    const list = await kitchen.get(`/v1/branches/${fresh.branchId}/pin-users`);
    expect(list.status).toBe(200);
    const bodyStr = JSON.stringify(list.body);
    expect(bodyStr.includes('pin_hash')).toBe(false);
    const items = (list.body as { items: Array<{ membershipId: string; roleKey: string }> }).items;
    expect(items.some((i) => i.membershipId === fresh.managerMembershipId)).toBe(true);
    expect(items.some((i) => i.roleKey === 'manager')).toBe(true);
  });

  it('pin-login switches session to target user', async () => {
    const fresh = await setupFreshOrgWithPins(app, jwt);
    const cashier = branchAgent(app, fresh.cashierToken, fresh.branchId);
    const oldToken = fresh.cashierToken;
    const login = await cashier.post('/v1/auth/pin-login').send({
      membershipId: fresh.managerMembershipId,
      pin: fresh.managerPin,
    });
    expect(login.status).toBe(201);
    const newToken = (login.body as { accessToken: string }).accessToken;
    const me = await withBearer(agent, newToken).get('/v1/me');
    expect((me.body as { user: { email: string | null } }).user.email).toContain('@');
    expect((await withBearer(agent, oldToken).get('/v1/me')).status).toBe(401);
  });

  it('cashier cancel placed order requires approval; manager PIN cancels with approver on event', async () => {
    const fresh = await setupFreshOrgWithPins(app, jwt);
    const cashier = branchAgent(app, fresh.cashierToken, fresh.branchId);
    const { orderId, version } = await placePlacedOrder(cashier, fresh.branchId, fresh.productId);

    const denied = await cashier.post(`/v1/branches/${fresh.branchId}/orders/${orderId}/status`).send({
      to: 'cancelled',
      expectedVersion: version,
      reason: 'Customer left',
    });
    expect(denied.status).toBe(403);
    expect((denied.body as ApiError).error.code).toBe('MANAGER_APPROVAL_REQUIRED');

    const ok = await cashier.post(`/v1/branches/${fresh.branchId}/orders/${orderId}/status`).send({
      to: 'cancelled',
      expectedVersion: version,
      reason: 'Customer left',
      approval: { membershipId: fresh.managerMembershipId, pin: fresh.managerPin },
    });
    expect([200, 201]).toContain(ok.status);
    expect((ok.body as { status: string }).status).toBe('cancelled');

    const events = await fresh.owner.ownerAgent.get(
      `/v1/branches/${fresh.branchId}/orders/${orderId}/events`,
    );
    const cancelled = (
      events.body as { items: Array<{ type: string; approverName: string | null; actorName: string | null }> }
    ).items.find((e) => e.type === 'cancelled');
    expect(cancelled?.approverName).not.toBeNull();
    expect(cancelled?.actorName).not.toBeNull();
  });

  it('wrong approval PIN returns 401 and leaves order unchanged', async () => {
    const fresh = await setupFreshOrgWithPins(app, jwt);
    const cashier = branchAgent(app, fresh.cashierToken, fresh.branchId);
    const { orderId, version } = await placePlacedOrder(cashier, fresh.branchId, fresh.productId);

    const bad = await cashier.post(`/v1/branches/${fresh.branchId}/orders/${orderId}/status`).send({
      to: 'cancelled',
      expectedVersion: version,
      reason: 'Nope',
      approval: { membershipId: fresh.managerMembershipId, pin: '9999' },
    });
    expect(bad.status).toBe(401);
    expect((bad.body as ApiError).error.code).toBe('PIN_INVALID');

    const get = await cashier.get(`/v1/branches/${fresh.branchId}/orders/${orderId}`);
    expect((get.body as { status: string }).status).toBe('placed');
  });

  it('PIN lock after 5 failures blocks login until clock advances', async () => {
    const clock = new MutableClock(new Date('2026-07-01T12:00:00.000Z'));
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CLOCK)
      .useValue(clock)
      .compile();
    const clockApp = moduleRef.createNestApplication();
    const env = loadEnv();
    clockApp.use(cookieParser());
    clockApp.enableCors({
      origin: env.CORS_ORIGINS?.split(',').map((s) => s.trim()) ?? true,
      credentials: true,
    });
    clockApp.enableShutdownHooks();
    const redisAdapter = new SocketIoRedisIoAdapter(clockApp);
    redisAdapter.connectToRedis();
    clockApp.useWebSocketAdapter(redisAdapter);
    await clockApp.init();
    const clockJwt = clockApp.get(JwtAccessService);

    const fresh = await setupFreshOrgWithPins(clockApp, clockJwt);
    const cashier = branchAgent(clockApp, fresh.cashierToken, fresh.branchId);
    const { orderId, version } = await placePlacedOrder(cashier, fresh.branchId, fresh.productId);

    for (let i = 0; i < 5; i += 1) {
      await cashier.post(`/v1/branches/${fresh.branchId}/orders/${orderId}/status`).send({
        to: 'cancelled',
        expectedVersion: version,
        reason: 'x',
        approval: { membershipId: fresh.managerMembershipId, pin: '0000' },
      });
    }

    const locked = await cashier.post(`/v1/branches/${fresh.branchId}/orders/${orderId}/status`).send({
      to: 'cancelled',
      expectedVersion: version,
      reason: 'x',
      approval: { membershipId: fresh.managerMembershipId, pin: fresh.managerPin },
    });
    expect(locked.status).toBe(423);
    expect((locked.body as ApiError).error.code).toBe('PIN_LOCKED');

    const pinLoginBlocked = await cashier.post('/v1/auth/pin-login').send({
      membershipId: fresh.managerMembershipId,
      pin: fresh.managerPin,
    });
    expect(pinLoginBlocked.status).toBe(423);

    clock.set(new Date('2026-07-01T12:06:00.000Z'));
    const pinLoginOk = await cashier.post('/v1/auth/pin-login').send({
      membershipId: fresh.managerMembershipId,
      pin: fresh.managerPin,
    });
    expect([200, 201]).toContain(pinLoginOk.status);

    await clockApp.close();
  });

  it('pin-login requires X-Branch-Id', async () => {
    const fresh = await setupFreshOrgWithPins(app, jwt);
    const res = await withBearer(agent, fresh.cashierToken).post('/v1/auth/pin-login').send({
      membershipId: fresh.managerMembershipId,
      pin: fresh.managerPin,
    });
    expect(res.status).toBe(400);
  });

  it('draft cancel by cashier works without approval', async () => {
    const fresh = await signupFreshOrg(app, jwt);
    const cat = await fresh.ownerAgent.post('/v1/categories').send({
      name: { en: 'C' },
      isActive: true,
    });
    if (cat.status !== 201) {
      throw new Error(`category create failed: ${JSON.stringify(cat.body)}`);
    }
    const categoryId = (cat.body as { id: string }).id;
    const prod = await fresh.ownerAgent.post('/v1/products').send({
      categoryId,
      name: { en: 'P' },
      priceMinor: 1000,
      isActive: true,
    });
    if (prod.status !== 201) {
      throw new Error(`product create failed: ${JSON.stringify(prod.body)}`);
    }
    const productId = (prod.body as { id: string }).id;
    const cashierEmail = `dc-${newUuidV7().slice(-8)}@example.com`;
    const inv = await fresh.ownerAgent.post('/v1/staff/invites').send({
      email: cashierEmail,
      roleKey: 'cashier',
      allBranches: true,
      branchIds: [],
    });
    const token = inv.body as { inviteUrl: string };
    const accept = await agent.post('/v1/auth/accept-invite').send({
      token: token.inviteUrl.split('/invite/')[1],
      password: fresh.password,
    });
    const cashierToken = (accept.body as { accessToken: string }).accessToken;
    const cashier = branchAgent(app, cashierToken, fresh.branchId);
    const payFirst = await fresh.ownerAgent
      .patch(`/v1/branches/${fresh.branchId}`)
      .send({ payBeforeSend: true });
    expect(payFirst.status).toBe(200);
    const clientOrderId = newUuidV7();
    const created = await postOrder(
      cashier,
      fresh.branchId,
      {
        clientOrderId,
        type: 'takeaway',
        items: [{ productId, quantity: 1, modifierIds: [] }],
      },
      clientOrderId,
    );
    expect(created.status).toBe(201);
    expect((created.body as { status: string }).status).toBe('draft');
    const orderId = (created.body as { id: string; version: number }).id;
    const version = (created.body as { version: number }).version;
    const cancel = await cashier.post(`/v1/branches/${fresh.branchId}/orders/${orderId}/status`).send({
      to: 'cancelled',
      expectedVersion: version,
      reason: 'mistake',
    });
    expect([200, 201]).toContain(cancel.status);
  });

  it('manager cancels placed order without approval PIN', async () => {
    const fresh = await setupFreshOrgWithPins(app, jwt);
    const manager = branchAgent(app, fresh.managerToken, fresh.branchId);
    const { orderId, version } = await placePlacedOrder(manager, fresh.branchId, fresh.productId);

    const cancel = await manager.post(`/v1/branches/${fresh.branchId}/orders/${orderId}/status`).send({
      to: 'cancelled',
      expectedVersion: version,
      reason: 'No show',
    });
    expect([200, 201]).toContain(cancel.status);
    expect((cancel.body as { status: string }).status).toBe('cancelled');
  });

  it('void item while preparing requires manager approval', async () => {
    const fresh = await setupFreshOrgWithPins(app, jwt);
    const cashier = branchAgent(app, fresh.cashierToken, fresh.branchId);
    const kitchen = branchAgent(app, fresh.kitchenToken, fresh.branchId);
    const manager = branchAgent(app, fresh.managerToken, fresh.branchId);
    const { orderId, version } = await placePlacedOrder(manager, fresh.branchId, fresh.productId);
    const preparingVersion = await advanceOrderToPreparing(kitchen, fresh.branchId, orderId, version);
    const statusCheck = await cashier.get(`/v1/branches/${fresh.branchId}/orders/${orderId}`);
    expect((statusCheck.body as { status: string }).status).toBe('preparing');

    const add = await cashier.post(`/v1/branches/${fresh.branchId}/orders/${orderId}/items`).send({
      expectedVersion: preparingVersion,
      items: [{ productId: fresh.productId, quantity: 1, modifierIds: [] }],
    });
    expect([200, 201]).toContain(add.status);
    const withTwo = add.body as {
      version: number;
      items: Array<{ id: string; isAddition: boolean }>;
    };
    const itemToVoid = withTwo.items.find((i) => !i.isAddition);
    expect(itemToVoid).toBeDefined();
    if (!itemToVoid) {
      return;
    }

    const denied = await cashier
      .post(`/v1/branches/${fresh.branchId}/orders/${orderId}/items/${itemToVoid.id}/void`)
      .send({
        expectedVersion: withTwo.version,
        reason: 'Wrong item',
      });
    expect(denied.status).toBe(403);
    expect((denied.body as ApiError).error.code).toBe('MANAGER_APPROVAL_REQUIRED');

    const ok = await cashier
      .post(`/v1/branches/${fresh.branchId}/orders/${orderId}/items/${itemToVoid.id}/void`)
      .send({
        expectedVersion: withTwo.version,
        reason: 'Wrong item',
        approval: { membershipId: fresh.managerMembershipId, pin: fresh.managerPin },
      });
    expect([200, 201]).toContain(ok.status);
  });

  it('stale expectedVersion returns 409 without incrementing PIN failures', async () => {
    const fresh = await setupFreshOrgWithPins(app, jwt);
    const cashier = branchAgent(app, fresh.cashierToken, fresh.branchId);
    const manager = branchAgent(app, fresh.managerToken, fresh.branchId);
    const { orderId, version } = await placePlacedOrder(cashier, fresh.branchId, fresh.productId);
    await advanceOrderToPreparing(manager, fresh.branchId, orderId, version);

    for (let i = 0; i < 6; i += 1) {
      const stale = await cashier.post(`/v1/branches/${fresh.branchId}/orders/${orderId}/status`).send({
        to: 'cancelled',
        expectedVersion: version,
        reason: 'Late',
        approval: { membershipId: fresh.managerMembershipId, pin: '0000' },
      });
      expect(stale.status).toBe(409);
      expect((stale.body as ApiError).error.code).toBe('ORDER_VERSION_CONFLICT');
    }

    const pinLoginOk = await cashier.post('/v1/auth/pin-login').send({
      membershipId: fresh.managerMembershipId,
      pin: fresh.managerPin,
    });
    expect([200, 201]).toContain(pinLoginOk.status);
  });

  it('cashier PIN cannot approve cancel (403)', async () => {
    const fresh = await setupFreshOrgWithPins(app, jwt);
    const cashier = branchAgent(app, fresh.cashierToken, fresh.branchId);
    const { orderId, version } = await placePlacedOrder(cashier, fresh.branchId, fresh.productId);

    const res = await cashier.post(`/v1/branches/${fresh.branchId}/orders/${orderId}/status`).send({
      to: 'cancelled',
      expectedVersion: version,
      reason: 'Test',
      approval: { membershipId: fresh.cashierMembershipId, pin: fresh.cashierPin },
    });
    expect(res.status).toBe(403);
  });

  it('pin-users excludes staff without access to the branch', async () => {
    const fresh = await setupFreshOrgWithPins(app, jwt);
    const branch2 = await fresh.owner.ownerAgent.post('/v1/branches').send({
      name: `Alt ${newUuidV7().slice(-6)}`,
      timezone: 'Asia/Riyadh',
      currency: 'SAR',
      taxRateBp: 1500,
      taxInclusive: true,
      dayStartHour: 4,
    });
    expect(branch2.status).toBe(201);
    const branch2Id = (branch2.body as { id: string }).id;

    const limitedEmail = `lim-${newUuidV7().slice(-8)}@example.com`;
    const inv = await fresh.owner.ownerAgent.post('/v1/staff/invites').send({
      email: limitedEmail,
      roleKey: 'manager',
      allBranches: false,
      branchIds: [branch2Id],
    });
    const token = extractInviteToken((inv.body as { inviteUrl: string }).inviteUrl);
    await agent.post('/v1/auth/accept-invite').send({
      token,
      password: fresh.owner.password,
    });
    const staff = (await fresh.owner.ownerAgent.get('/v1/staff')).body as {
      items: Array<{ email: string | null; id: string }>;
    };
    const limitedRow = staff.items.find((i) => i.email === limitedEmail);
    await fresh.owner.ownerAgent.put(`/v1/staff/${limitedRow?.id ?? ''}/pin`).send({ pin: '7777' });

    const kitchen = branchAgent(app, fresh.kitchenToken, fresh.branchId);
    const onMain = await kitchen.get(`/v1/branches/${fresh.branchId}/pin-users`);
    expect(onMain.status).toBe(200);
    const mainIds = (onMain.body as { items: Array<{ membershipId: string }> }).items.map(
      (i) => i.membershipId,
    );
    expect(mainIds.includes(limitedRow?.id ?? '')).toBe(false);
    expect(mainIds.includes(fresh.managerMembershipId)).toBe(true);

    const onBranch2 = await kitchen.get(`/v1/branches/${branch2Id}/pin-users`);
    expect(onBranch2.status).toBe(200);
    const branch2Ids = (onBranch2.body as { items: Array<{ membershipId: string }> }).items.map(
      (i) => i.membershipId,
    );
    expect(branch2Ids.includes(limitedRow?.id ?? '')).toBe(true);
  });

  it('pin-login returns 404 for membership in another org', async () => {
    const orgA = await setupFreshOrgWithPins(app, jwt);
    const orgB = await setupFreshOrgWithPins(app, jwt);
    const cashierA = branchAgent(app, orgA.cashierToken, orgA.branchId);

    const res = await cashierA.post('/v1/auth/pin-login').send({
      membershipId: orgB.managerMembershipId,
      pin: orgB.managerPin,
    });
    expect(res.status).toBe(404);
  });
});
