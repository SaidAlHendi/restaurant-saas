import type { Server } from 'node:http';

import { type INestApplication } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { io, type Socket } from 'socket.io-client';

import { PLAN_IDS } from '@app/shared';

import { JwtAccessService } from '../src/core/auth/jwt.service';
import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { memberships } from '../src/core/db/schema/tenancy';
import { withOrg } from '../src/core/db/with-org';
import { newUuidV7 } from '../src/lib/uuid';
import { SubscriptionService } from '../src/modules/billing/subscription.service';
import { OrderingRepository } from '../src/modules/ordering/ordering.repository';

import { createTestApp } from './create-test-app';
import { apiAgent, withBearer } from './http';
import { createIsolatedBranch, insertPlacedOrderForBusinessDate } from './ordering-helpers';
import { extractInviteToken, signupFreshOrg, type FreshOrg } from './staff-settings-helpers';

type ApiError = { error: { code?: string } };

function listenPort(app: INestApplication): number {
  const addr = (app.getHttpServer() as Server).address();
  if (addr !== null && typeof addr === 'object' && typeof addr.port === 'number') {
    return addr.port;
  }
  throw new Error('expected bound server');
}

function connectSocket(port: number, auth: { token: string; branchId: string }): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(`http://127.0.0.1:${String(port)}/rt`, {
      transports: ['websocket'],
      auth,
      reconnection: false,
      timeout: 5_000,
    });
    socket.on('connect', () => {
      resolve(socket);
    });
    socket.on('connect_error', (err: Error) => {
      reject(err);
    });
  });
}

describe('Review fixes (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtAccessService;
  let db: DrizzleDb;
  let port = 0;

  beforeAll(async () => {
    ({ app } = await createTestApp({ WEB_APP_URL: 'http://localhost:5173' }));
    await app.listen(0);
    port = listenPort(app);
    jwt = app.get(JwtAccessService);
    db = app.get(DRIZZLE);
  });

  afterAll(async () => {
    await app.close();
  });

  async function inviteAndAccept(
    fresh: FreshOrg,
    body: { roleKey: string; allBranches: boolean; branchIds: string[] },
  ): Promise<{ membershipId: string; accessToken: string }> {
    const email = `staff-${newUuidV7().slice(-8)}@example.com`;
    const invite = await fresh.ownerAgent.post('/v1/staff/invites').send({ email, ...body });
    expect(invite.status).toBe(201);
    const { membershipId, inviteUrl } = invite.body as { membershipId: string; inviteUrl: string };
    const accepted = await apiAgent(app)
      .post('/v1/auth/accept-invite')
      .send({ token: extractInviteToken(inviteUrl), password: fresh.password, name: 'Staff' });
    expect([200, 201]).toContain(accepted.status);
    return { membershipId, accessToken: (accepted.body as { accessToken: string }).accessToken };
  }

  async function setFreePlan(orgId: string): Promise<void> {
    await app.get(SubscriptionService).applySubscriptionPatch(orgId, {
      planId: PLAN_IDS.free,
      status: 'active',
      provider: null,
      trialEndsAt: null,
    });
  }

  it('does not hand the inviter a link for an existing password-less account', async () => {
    const orgA = await signupFreshOrg(app, jwt);
    const orgB = await signupFreshOrg(app, jwt);
    const email = `invitee-${newUuidV7().slice(-8)}@example.com`;
    const body = { email, roleKey: 'cashier', allBranches: true, branchIds: [] };

    const first = await orgA.ownerAgent.post('/v1/staff/invites').send(body);
    expect(first.status).toBe(201);
    expect((first.body as { inviteUrl: string | null }).inviteUrl).toEqual(expect.any(String));

    // Org B must not get a link that could set the password of the account org A created.
    const second = await orgB.ownerAgent.post('/v1/staff/invites').send(body);
    expect(second.status).toBe(201);
    const { membershipId, inviteUrl } = second.body as {
      membershipId: string;
      inviteUrl: string | null;
    };
    expect(inviteUrl).toBeNull();

    const regenerated = await orgB.ownerAgent.post(`/v1/staff/${membershipId}/invite/regenerate`);
    expect([200, 201]).toContain(regenerated.status);
    expect((regenerated.body as { inviteUrl: string | null }).inviteUrl).toBeNull();
  });

  it('scoped staff lose access to a branch once it is deactivated', async () => {
    const fresh = await signupFreshOrg(app, jwt);
    const { branchId } = await createIsolatedBranch(fresh.ownerAgent);
    const { accessToken } = await inviteAndAccept(fresh, {
      roleKey: 'cashier',
      allBranches: false,
      branchIds: [branchId],
    });
    const cashier = withBearer(apiAgent(app), accessToken);

    const before = await cashier.get(`/v1/branches/${branchId}/orders`).set('X-Branch-Id', branchId);
    expect(before.status).toBe(200);

    const off = await fresh.ownerAgent.patch(`/v1/branches/${branchId}`).send({ isActive: false });
    expect(off.status).toBe(200);

    const after = await cashier.get(`/v1/branches/${branchId}/orders`).set('X-Branch-Id', branchId);
    expect(after.status).toBe(403);
  });

  it('disconnects open sockets when a member is disabled', async () => {
    const fresh = await signupFreshOrg(app, jwt);
    const { membershipId, accessToken } = await inviteAndAccept(fresh, {
      roleKey: 'cashier',
      allBranches: false,
      branchIds: [fresh.branchId],
    });
    const socket = await connectSocket(port, { token: accessToken, branchId: fresh.branchId });

    const disconnected = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('socket was not disconnected'));
      }, 10_000);
      socket.on('disconnect', (reason) => {
        clearTimeout(timer);
        resolve(reason);
      });
    });

    const patch = await fresh.ownerAgent
      .patch(`/v1/staff/${membershipId}`)
      .send({ status: 'disabled' });
    expect(patch.status).toBe(200);
    expect(await disconnected).toBe('io server disconnect');

    // Reconnecting with the same token now fails: its session was revoked.
    await expect(
      connectSocket(port, { token: accessToken, branchId: fresh.branchId }),
    ).rejects.toMatchObject({ message: 'UNAUTHORIZED' });
  });

  it('kitchen board keeps new tickets when ready orders pile up', async () => {
    const fresh = await signupFreshOrg(app, jwt);
    const owner = await withOrg(db, fresh.orgId, (tx) =>
      tx.select().from(memberships).where(eq(memberships.orgId, fresh.orgId)).limit(1),
    );
    const createdBy = owner[0]?.id ?? '';
    const insert = (orderNumber: number) =>
      insertPlacedOrderForBusinessDate(db, {
        orgId: fresh.orgId,
        branchId: fresh.branchId,
        businessDate: '2026-01-01',
        orderNumber,
        createdByMembershipId: createdBy,
      });
    const oldReady = await insert(1);
    const newPlaced = await insert(2);
    await withOrg(db, fresh.orgId, (tx) =>
      tx.execute(
        sql`UPDATE orders SET status = 'ready', placed_at = now() - interval '2 days' WHERE id = ${oldReady}`,
      ),
    );

    const repo = app.get(OrderingRepository);
    const board = await withOrg(db, fresh.orgId, (tx) =>
      repo.listKitchenBoardOrders(tx, fresh.branchId, 1),
    );
    expect(board.map((o) => o.id)).toEqual([newPlaced]);

    const both = await withOrg(db, fresh.orgId, (tx) =>
      repo.listKitchenBoardOrders(tx, fresh.branchId, 10),
    );
    expect(both.map((o) => o.id)).toEqual([oldReady, newPlaced]);
  });

  it('single-price plans cannot add a second active branch', async () => {
    const fresh = await signupFreshOrg(app, jwt);
    // Trial (restaurant, billed per branch) may add branches.
    const { branchId } = await createIsolatedBranch(fresh.ownerAgent);

    await setFreePlan(fresh.orgId);
    const blocked = await fresh.ownerAgent.post('/v1/branches').send({
      name: 'Second',
      slug: `s-${newUuidV7().slice(-8)}`,
      timezone: 'Asia/Riyadh',
      currency: 'SAR',
      taxRateBp: 1500,
      taxInclusive: false,
      dayStartHour: 4,
    });
    expect(blocked.status).toBe(403);
    expect((blocked.body as ApiError).error.code).toBe('PLAN_LIMIT_REACHED');

    // Deactivating then reactivating the extra branch is also blocked while another is active.
    expect(
      (await fresh.ownerAgent.patch(`/v1/branches/${branchId}`).send({ isActive: false })).status,
    ).toBe(200);
    const reactivate = await fresh.ownerAgent
      .patch(`/v1/branches/${branchId}`)
      .send({ isActive: true });
    expect(reactivate.status).toBe(403);
  });

  it('table create/patch hide the QR token without menu.table_qr', async () => {
    const fresh = await signupFreshOrg(app, jwt);
    const created = await fresh.ownerAgent
      .post(`/v1/branches/${fresh.branchId}/tables`)
      .set('X-Branch-Id', fresh.branchId)
      .send({ label: 'T1' });
    expect(created.status).toBe(201);
    expect((created.body as { qrToken?: string }).qrToken).toEqual(expect.any(String));
    const tableId = (created.body as { id: string }).id;

    await setFreePlan(fresh.orgId);
    const freeCreate = await fresh.ownerAgent
      .post(`/v1/branches/${fresh.branchId}/tables`)
      .set('X-Branch-Id', fresh.branchId)
      .send({ label: 'T2' });
    expect(freeCreate.status).toBe(201);
    expect(freeCreate.body).not.toHaveProperty('qrToken');

    const freePatch = await fresh.ownerAgent
      .patch(`/v1/branches/${fresh.branchId}/tables/${tableId}`)
      .set('X-Branch-Id', fresh.branchId)
      .send({ label: 'T1b' });
    expect(freePatch.status).toBe(200);
    expect(freePatch.body).not.toHaveProperty('qrToken');
  });
});
