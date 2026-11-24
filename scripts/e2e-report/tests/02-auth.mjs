import { t, assert, expectStatus } from '../lib/runner.mjs';
import { Client } from '../lib/http.mjs';
import { config } from '../lib/config.mjs';
import { signup, login, email } from '../lib/helpers.mjs';

const R = 'Owner';
const F = 'Auth & signup';

t(R, F, 'Signup rejects an invalid email', async () => {
  const res = await new Client().post('/v1/auth/signup', {
    name: 'X', email: 'nope', password: config.password, restaurantName: 'X', country: 'SA',
    timezone: 'Asia/Riyadh', currency: 'SAR', defaultLocale: 'en',
  });
  expectStatus(res, 400);
});

t(R, F, 'Signup rejects a short password', async () => {
  const res = await new Client().post('/v1/auth/signup', {
    name: 'X', email: email('short'), password: 'short', restaurantName: 'X', country: 'SA',
    timezone: 'Asia/Riyadh', currency: 'SAR', defaultLocale: 'en',
  });
  expectStatus(res, 400);
});

t(R, F, 'Owner signs up: org, branch and token are created', async (ctx) => {
  const { res, client } = await signup('owner');
  expectStatus(res, 201, 'signup (limit is 5 signups per hour per IP; clear redis keys "throttler*" if you hit 429)');
  assert.ok(res.body.accessToken && res.body.org?.id && res.body.branch?.id);
  ctx.owner = client.inBranch(res.body.branch.id);
  ctx.ownerEmail = email('owner');
  ctx.orgId = res.body.org.id;
  ctx.orgSlug = res.body.org.slug;
  ctx.branchId = res.body.branch.id;
  ctx.branchSlug = res.body.branch.slug;
  ctx.signupBody = res.body;
});

t(R, F, 'Duplicate email signup is rejected', async (ctx) => {
  const { res } = await signup('owner');
  assert.ok([400, 409].includes(res.status), `expected 400/409, got ${res.status}`);
});

t(R, F, 'GET /me returns owner role, permissions and trial entitlements', async (ctx) => {
  const res = expectStatus(await ctx.owner.get('/v1/me'), 200);
  assert.equal(res.body.role.key, 'owner');
  assert.ok(res.body.permissions.includes('menu.manage'));
  assert.equal(res.body.entitlements.planKey, 'restaurant');
  assert.equal(res.body.entitlements.status, 'trialing');
  assert.ok(res.body.entitlements.features.includes('pos.access'));
  ctx.ownerPermissions = res.body.permissions;
});

t(R, F, 'Login with the right password works', async (ctx) => {
  const { res } = await login(ctx.ownerEmail);
  expectStatus(res, [200, 201]);
  assert.ok(res.body.accessToken);
});

t(R, F, 'Login with a wrong password returns 401', async (ctx) => {
  const { res } = await login(ctx.ownerEmail, 'wrong-password-123');
  expectStatus(res, 401);
});

t(R, F, 'Login with an unknown email returns 401 (no user enumeration)', async () => {
  const { res } = await login('nobody-' + Date.now() + '@example.com');
  expectStatus(res, 401);
});

t(R, F, 'Refresh token cookie issues a new access token', async (ctx) => {
  const c = new Client();
  expectStatus(await c.post('/v1/auth/login', { email: ctx.ownerEmail, password: config.password }), [200, 201]);
  const res = expectStatus(await c.post('/v1/auth/refresh'), [200, 201]);
  assert.ok(res.body.accessToken);
});

t(R, F, 'Refresh without a cookie returns 401', async () => {
  expectStatus(await new Client().post('/v1/auth/refresh'), 401);
});

t(R, F, 'Logout then refresh fails', async (ctx) => {
  const c = new Client();
  await c.post('/v1/auth/login', { email: ctx.ownerEmail, password: config.password });
  expectStatus(await c.post('/v1/auth/logout'), [200, 201, 204]);
  expectStatus(await c.post('/v1/auth/refresh'), 401);
});

t(R, F, 'Switch-org to the own org keeps access', async (ctx) => {
  const res = await ctx.owner.post('/v1/auth/switch-org', { orgId: ctx.orgId });
  expectStatus(res, [200, 201]);
  // Switching issues a new session and retires the old one, so carry on with the new token.
  if (res.body?.accessToken) ctx.owner = ctx.owner.withToken(res.body.accessToken);
  expectStatus(await ctx.owner.get('/v1/me'), 200);
});

t(R, F, 'Invite preview of an invalid token returns 404', async () => {
  expectStatus(await new Client().get('/v1/auth/invites/not-a-real-token'), [400, 404]);
});
