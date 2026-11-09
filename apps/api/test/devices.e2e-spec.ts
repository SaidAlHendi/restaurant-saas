import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import type { Agent } from 'supertest';

import { AppModule } from '../src/app.module';

import { JwtAccessService } from '../src/core/auth/jwt.service';
import { CLOCK, type Clock } from '../src/core/clock/clock.tokens';

import { createTestApp } from './create-test-app';
import { apiAgent } from './http';
import { branchAgent, setupFreshOrgWithPins, type StaffPins } from './pin-approval-helpers';

type ApiError = { error: { code?: string; message: string } };
type CreatedDevice = { device: { id: string; status: string }; pairingCode: string };

class MutableClock implements Clock {
  constructor(private at: Date) {}

  set(at: Date): void {
    this.at = at;
  }

  now(): Date {
    return this.at;
  }
}

async function createDevice(owner: Agent, branchId: string, name = 'Front counter') {
  const res = await owner.post('/v1/devices').send({ branchId, name });
  return res;
}

async function pairedDevice(app: INestApplication, fresh: StaffPins) {
  const created = await createDevice(fresh.owner.ownerAgent, fresh.branchId);
  expect(created.status).toBe(201);
  const body = created.body as CreatedDevice;
  const paired = await apiAgent(app).post('/v1/auth/device/pair').send({ code: body.pairingCode });
  expect(paired.status).toBe(201);
  return { deviceId: body.device.id, deviceKey: (paired.body as { deviceKey: string }).deviceKey };
}

describe('POS device linking (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtAccessService;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    jwt = app.get(JwtAccessService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('owner creates a pending device with a one-time code; cashier cannot', async () => {
    const fresh = await setupFreshOrgWithPins(app, jwt);
    const created = await createDevice(fresh.owner.ownerAgent, fresh.branchId);
    expect(created.status).toBe(201);
    const body = created.body as CreatedDevice;
    expect(body.pairingCode).toMatch(/^[2-9A-HJKMNP-Z]{8}$/);
    expect(body.device.status).toBe('pending');
    expect(JSON.stringify(created.body)).not.toMatch(/hash/i);

    const list = await fresh.owner.ownerAgent.get('/v1/devices');
    expect(list.status).toBe(200);
    expect((list.body as { items: Array<{ id: string }> }).items.map((i) => i.id)).toContain(
      body.device.id,
    );

    const cashier = branchAgent(app, fresh.cashierToken, fresh.branchId);
    expect((await cashier.get('/v1/devices')).status).toBe(403);
    expect(
      (await cashier.post('/v1/devices').send({ branchId: fresh.branchId, name: 'x' })).status,
    ).toBe(403);
  });

  it('a code pairs exactly once, ignoring case and dashes', async () => {
    const fresh = await setupFreshOrgWithPins(app, jwt);
    const created = (await createDevice(fresh.owner.ownerAgent, fresh.branchId))
      .body as CreatedDevice;
    const code = created.pairingCode;
    const spaced = `${code.slice(0, 4)}-${code.slice(4)}`.toLowerCase();

    const first = await apiAgent(app).post('/v1/auth/device/pair').send({ code: spaced });
    expect(first.status).toBe(201);
    const pairedBody = first.body as { deviceKey: string; device: { name: string } };
    expect(pairedBody.deviceKey.length).toBeGreaterThanOrEqual(32);
    expect(pairedBody.device.name).toBe('Front counter');

    const again = await apiAgent(app).post('/v1/auth/device/pair').send({ code });
    expect(again.status).toBe(404);
    expect((again.body as ApiError).error.code).toBe('PAIRING_CODE_INVALID');

    const list = await fresh.owner.ownerAgent.get('/v1/devices');
    const row = (list.body as { items: Array<{ id: string; status: string }> }).items.find(
      (i) => i.id === created.device.id,
    );
    expect(row?.status).toBe('active');
  });

  it('rejects an unknown pairing code', async () => {
    const res = await apiAgent(app).post('/v1/auth/device/pair').send({ code: 'ZZZZZZZZ' });
    expect(res.status).toBe(404);
  });

  it('rejects an expired pairing code', async () => {
    const clock = new MutableClock(new Date('2026-07-01T12:00:00.000Z'));
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CLOCK)
      .useValue(clock)
      .compile();
    const clockApp = moduleRef.createNestApplication();
    clockApp.use(cookieParser());
    await clockApp.init();
    try {
      const fresh = await setupFreshOrgWithPins(clockApp, clockApp.get(JwtAccessService));
      const created = (await createDevice(fresh.owner.ownerAgent, fresh.branchId))
        .body as CreatedDevice;
      clock.set(new Date('2026-07-01T12:16:00.000Z'));
      const res = await apiAgent(clockApp)
        .post('/v1/auth/device/pair')
        .send({ code: created.pairingCode });
      expect(res.status).toBe(404);
    } finally {
      await clockApp.close();
    }
  });

  it('lists only PIN staff of the device branch, without secrets', async () => {
    const fresh = await setupFreshOrgWithPins(app, jwt);
    const { deviceKey } = await pairedDevice(app, fresh);
    const res = await apiAgent(app).post('/v1/auth/device/pin-users').send({ deviceKey });
    expect(res.status).toBe(201);
    const body = res.body as {
      items: Array<{ membershipId: string; roleKey: string }>;
      device: { branchName: string };
    };
    expect(body.items.map((i) => i.membershipId)).toContain(fresh.cashierMembershipId);
    expect(JSON.stringify(res.body)).not.toMatch(/pin_hash|pinHash/);
    expect(body.device.branchName.length).toBeGreaterThan(0);

    const bad = await apiAgent(app)
      .post('/v1/auth/device/pin-users')
      .send({ deviceKey: 'x'.repeat(43) });
    expect(bad.status).toBe(401);
    expect((bad.body as ApiError).error.code).toBe('DEVICE_INVALID');
  });

  it('signs a cashier in with the PIN on a linked device, and a wrong PIN fails', async () => {
    const fresh = await setupFreshOrgWithPins(app, jwt);
    const { deviceKey, deviceId } = await pairedDevice(app, fresh);

    const wrong = await apiAgent(app)
      .post('/v1/auth/device/pin-login')
      .send({ deviceKey, membershipId: fresh.cashierMembershipId, pin: '9999' });
    expect(wrong.status).toBe(401);

    const ok = await apiAgent(app)
      .post('/v1/auth/device/pin-login')
      .send({ deviceKey, membershipId: fresh.cashierMembershipId, pin: fresh.cashierPin });
    expect(ok.status).toBe(201);
    const token = (ok.body as { accessToken: string }).accessToken;
    const me = await apiAgent(app).get('/v1/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(JSON.stringify(me.body)).toContain('cashier');

    const list = await fresh.owner.ownerAgent.get('/v1/devices');
    const row = (
      list.body as { items: Array<{ id: string; lastUsedAt: string | null }> }
    ).items.find((i) => i.id === deviceId);
    expect(row?.lastUsedAt).not.toBeNull();
  });

  it('a device key cannot sign in staff of another restaurant', async () => {
    const a = await setupFreshOrgWithPins(app, jwt);
    const b = await setupFreshOrgWithPins(app, jwt);
    const { deviceKey } = await pairedDevice(app, a);
    const res = await apiAgent(app)
      .post('/v1/auth/device/pin-login')
      .send({ deviceKey, membershipId: b.cashierMembershipId, pin: b.cashierPin });
    expect([401, 403, 404]).toContain(res.status);
    expect((res.body as { accessToken?: string }).accessToken).toBeUndefined();
  });

  it('revoking a device stops it at once', async () => {
    const fresh = await setupFreshOrgWithPins(app, jwt);
    const { deviceKey, deviceId } = await pairedDevice(app, fresh);
    const del = await fresh.owner.ownerAgent.delete(`/v1/devices/${deviceId}`);
    expect(del.status).toBe(204);

    const users = await apiAgent(app).post('/v1/auth/device/pin-users').send({ deviceKey });
    expect(users.status).toBe(401);
    const login = await apiAgent(app)
      .post('/v1/auth/device/pin-login')
      .send({ deviceKey, membershipId: fresh.cashierMembershipId, pin: fresh.cashierPin });
    expect(login.status).toBe(401);

    const list = await fresh.owner.ownerAgent.get('/v1/devices');
    expect((list.body as { items: Array<{ id: string }> }).items.map((i) => i.id)).not.toContain(
      deviceId,
    );
  });

  it("another restaurant's owner cannot revoke or see this device", async () => {
    const a = await setupFreshOrgWithPins(app, jwt);
    const b = await setupFreshOrgWithPins(app, jwt);
    const { deviceId } = await pairedDevice(app, a);
    const del = await b.owner.ownerAgent.delete(`/v1/devices/${deviceId}`);
    expect(del.status).toBe(404);
    const list = await b.owner.ownerAgent.get('/v1/devices');
    expect(JSON.stringify(list.body)).not.toContain(deviceId);
  });
});
