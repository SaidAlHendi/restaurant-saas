import type { Server } from 'node:http';

import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { type INestApplication } from '@nestjs/common';
import request, { type Agent } from 'supertest';
import { Test } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { resetEnvCacheForTests } from '../src/config/env';
import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { users as usersTable } from '../src/core/db/schema/identity';
import { memberships } from '../src/core/db/schema/tenancy';
import { withOrg } from '../src/core/db/with-org';
import { REFRESH_COOKIE_NAME } from '../src/modules/identity/constants';
import { newUuidV7 } from '../src/lib/uuid';
import { loginSeedUser, seedPassword, SEED_ORG } from './factories';
import { apiAgent } from './http';
import { createTestApp } from './create-test-app';

type AccessTokenResponse = { accessToken: string };
type ApiErrorResponse = { error: { message: string; code?: string } };

function refreshCookieFromResponse(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  const setCookie = headers['set-cookie'];
  const parts = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  for (const part of parts) {
    const prefix = `${REFRESH_COOKIE_NAME}=`;
    if (part.startsWith(prefix)) {
      return part.slice(prefix.length).split(';')[0];
    }
  }
  return undefined;
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;
  let db: DrizzleDb;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
    resetEnvCacheForTests();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    db = moduleRef.get(DRIZZLE);
  });

  afterAll(async () => {
    await app.close();
  });

  it('signup and login return access token', async () => {
    const email = `user-${String(Date.now())}@example.com`;
    const signup = await agent.post('/v1/auth/signup').send({
      name: 'Test User',
      email,
      password: 'password-1234',
      restaurantName: 'Test Cafe',
      country: 'SA',
      timezone: 'Asia/Riyadh',
      currency: 'SAR',
      defaultLocale: 'en',
    });
    expect(signup.status).toBe(201);
    expect((signup.body as AccessTokenResponse).accessToken).toBeDefined();

    const login = await agent.post('/v1/auth/login').send({
      email,
      password: 'password-1234',
    });
    expect(login.status).toBe(201);
    expect((login.body as AccessTokenResponse).accessToken).toBeDefined();
  });

  it('login wrong password uses same error message', async () => {
    const bad = await agent.post('/v1/auth/login').send({
      email: 'missing@example.com',
      password: 'wrong-password-1',
    });
    const bad2 = await agent.post('/v1/auth/login').send({
      email: 'owner@demo.local',
      password: 'wrong-password-1',
    });
    expect(bad.status).toBe(401);
    expect(bad2.status).toBe(401);
    expect((bad.body as ApiErrorResponse).error.message).toBe(
      (bad2.body as ApiErrorResponse).error.message,
    );
  });

  it('refresh rotates cookie and reuse clears session', async () => {
    const server = app.getHttpServer() as Server;
    const login = await request(server).post('/v1/auth/login').send({
      email: 'owner@demo.local',
      password: seedPassword(),
    });
    expect([200, 201]).toContain(login.status);
    const oldCookie = refreshCookieFromResponse(login.headers);
    expect(oldCookie && oldCookie.length > 0).toBe(true);

    const firstRefresh = await request(server)
      .post('/v1/auth/refresh')
      .set('Cookie', `${REFRESH_COOKIE_NAME}=${oldCookie ?? ''}`);
    expect([200, 201]).toContain(firstRefresh.status);
    const newCookie = refreshCookieFromResponse(firstRefresh.headers);
    expect(newCookie).toBeDefined();
    expect(newCookie).not.toBe(oldCookie);

    const reuse = await request(server)
      .post('/v1/auth/refresh')
      .set('Cookie', `${REFRESH_COOKIE_NAME}=${oldCookie ?? ''}`);
    expect(reuse.status).toBe(401);
  });

  it('logout works without access token and clears refresh cookie', async () => {
    const login = await agent.post('/v1/auth/login').send({
      email: 'owner@demo.local',
      password: seedPassword(),
    });
    expect([200, 201]).toContain(login.status);
    const cookie = refreshCookieFromResponse(login.headers);
    const logout = await agent
      .post('/v1/auth/logout')
      .set('Authorization', 'Bearer expired.invalid.token')
      .set('Cookie', `${REFRESH_COOKIE_NAME}=${cookie ?? ''}`);
    expect([200, 201]).toContain(logout.status);

    const refreshAfter = await agent
      .post('/v1/auth/refresh')
      .set('Cookie', `${REFRESH_COOKIE_NAME}=${cookie ?? ''}`);
    expect(refreshAfter.status).toBe(401);
  });

  it('switch-org rejects non-member org', async () => {
    const demo = await loginSeedUser(agent, 'owner', 'demo');
    const res = await agent
      .post('/v1/auth/switch-org')
      .set('Authorization', `Bearer ${demo.accessToken}`)
      .send({ orgId: '00000000-0000-4000-8000-000000009999' });
    expect(res.status).toBe(403);
  });

  it('login returns 403 when user has zero active memberships', async () => {
    const userId = newUuidV7();
    const email = `nomember-${userId.slice(0, 8)}@example.com`;
    const passwordHash = await argon2.hash('password-1234567', { type: argon2.argon2id });
    await db.insert(usersTable).values({
      id: userId,
      email,
      passwordHash,
      name: 'No Member',
      locale: 'en',
    });

    const login = await agent.post('/v1/auth/login').send({
      email,
      password: 'password-1234567',
    });
    expect(login.status).toBe(403);
    expect((login.body as ApiErrorResponse).error.code).toBe('NO_ACTIVE_MEMBERSHIP');
  });

  it('disabled membership yields 401 on authenticated routes', async () => {
    const userId = newUuidV7();
    const email = `disabled-${userId.slice(0, 8)}@example.com`;
    const passwordHash = await argon2.hash('password-1234567', { type: argon2.argon2id });
    await db.insert(usersTable).values({
      id: userId,
      email,
      passwordHash,
      name: 'Disabled Member',
      locale: 'en',
      lastOrgId: SEED_ORG.demo.id,
    });

    const signupMembershipId = newUuidV7();
    await withOrg(db, SEED_ORG.demo.id, async (tx) => {
      await tx.insert(memberships).values({
        id: signupMembershipId,
        orgId: SEED_ORG.demo.id,
        userId,
        roleId: '00000000-0000-4000-8000-000000000103',
        allBranches: true,
        status: 'disabled',
      });
    });

    const login = await agent.post('/v1/auth/login').send({
      email,
      password: 'password-1234567',
    });
    expect(login.status).toBe(403);

    await withOrg(db, SEED_ORG.demo.id, async (tx) => {
      await tx
        .update(memberships)
        .set({ status: 'active' })
        .where(eq(memberships.id, signupMembershipId));
    });

    const loginOk = await agent.post('/v1/auth/login').send({
      email,
      password: 'password-1234567',
    });
    expect([200, 201]).toContain(loginOk.status);
    const token = (loginOk.body as AccessTokenResponse).accessToken;

    await withOrg(db, SEED_ORG.demo.id, async (tx) => {
      await tx
        .update(memberships)
        .set({ status: 'disabled' })
        .where(eq(memberships.id, signupMembershipId));
    });

    const me = await agent.get('/v1/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(401);
    expect((me.body as ApiErrorResponse).error.code).toBe('MEMBERSHIP_DISABLED');
  });
});
