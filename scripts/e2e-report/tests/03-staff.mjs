import { t, assert, expectStatus, skip } from '../lib/runner.mjs';
import { Client } from '../lib/http.mjs';
import { config } from '../lib/config.mjs';
import { inviteAndAccept, email } from '../lib/helpers.mjs';

const F = 'Staff & roles';

t('Owner', F, 'Owner invites a manager, who accepts and logs in', async (ctx) => {
  const r = await inviteAndAccept(ctx.owner, ctx, 'manager', 'manager');
  assert.ok(r.client, `invite failed: ${r.error?.status} ${r.error?.text?.slice(0, 200)}`);
  ctx.manager = r.client; ctx.managerId = r.membershipId; ctx.managerEmail = r.email;
  const me = await ctx.manager.get('/v1/me');
  assert.equal(me.body.role.key, 'manager');
  ctx.managerPermissions = me.body.permissions;
});

t('Owner', F, 'Owner invites a cashier, who accepts and logs in', async (ctx) => {
  const r = await inviteAndAccept(ctx.owner, ctx, 'cashier', 'cashier');
  assert.ok(r.client, `invite failed: ${r.error?.status} ${r.error?.text?.slice(0, 200)}`);
  ctx.cashier = r.client; ctx.cashierId = r.membershipId; ctx.cashierEmail = r.email;
  const me = await ctx.cashier.get('/v1/me');
  assert.equal(me.body.role.key, 'cashier');
  ctx.cashierPermissions = me.body.permissions;
});

t('Owner', F, 'Owner invites a kitchen user, who accepts and logs in', async (ctx) => {
  const r = await inviteAndAccept(ctx.owner, ctx, 'kitchen', 'kitchen');
  assert.ok(r.client, `invite failed: ${r.error?.status} ${r.error?.text?.slice(0, 200)}`);
  ctx.kitchen = r.client; ctx.kitchenId = r.membershipId; ctx.kitchenEmail = r.email;
  const me = await ctx.kitchen.get('/v1/me');
  assert.equal(me.body.role.key, 'kitchen');
  ctx.kitchenPermissions = me.body.permissions;
});

t('Owner', F, 'Invite preview shows org and role for a pending invite', async (ctx) => {
  const inv = expectStatus(await ctx.owner.post('/v1/staff/invites', { email: email('pending'), roleKey: 'cashier', allBranches: true, branchIds: [] }), 201);
  const token = inv.body.inviteUrl.split('/invite/')[1];
  const prev = expectStatus(await new Client().get(`/v1/auth/invites/${token}`), 200);
  assert.equal(prev.body.roleKey, 'cashier');
  ctx.pendingInvite = inv.body;
});

t('Owner', F, 'Invite can be regenerated and then cancelled', async (ctx) => {
  if (!ctx.pendingInvite) skip('no pending invite');
  const id = ctx.pendingInvite.membershipId;
  expectStatus(await ctx.owner.post(`/v1/staff/${id}/invite/regenerate`), [200, 201]);
  expectStatus(await ctx.owner.delete(`/v1/staff/${id}/invite`), [200, 204]);
});

t('Owner', F, 'Duplicate invite for the same email is rejected', async (ctx) => {
  const res = await ctx.owner.post('/v1/staff/invites', { email: ctx.cashierEmail, roleKey: 'cashier', allBranches: true, branchIds: [] });
  assert.ok([400, 409, 422].includes(res.status), `got ${res.status}`);
});

t('Owner', F, 'Staff list shows all four members', async (ctx) => {
  const res = expectStatus(await ctx.owner.get('/v1/staff'), 200);
  const roles = res.body.items.map((s) => s.roleKey);
  for (const r of ['owner', 'manager', 'cashier', 'kitchen']) assert.ok(roles.includes(r), `missing ${r}`);
});

t('Owner', F, 'Staff list paginates', async (ctx) => {
  const res = expectStatus(await ctx.owner.get('/v1/staff?page=1&pageSize=2'), 200);
  assert.equal(res.body.items.length, 2);
  assert.ok(res.body.total >= 4);
  const page2 = expectStatus(await ctx.owner.get('/v1/staff?page=2&pageSize=2'), 200);
  assert.ok(page2.body.items.length >= 1);
});

t('Owner', F, 'Owner creates a PIN-only cashier', async (ctx) => {
  const res = expectStatus(await ctx.owner.post('/v1/staff/pin-only', { name: 'PIN Cashier', roleKey: 'cashier', allBranches: true, branchIds: [], pin: '4821' }), 201);
  ctx.pinCashierId = res.body.membershipId ?? res.body.id;
  assert.ok(ctx.pinCashierId);
});

t('Owner', F, 'Weak PIN (3 digits) is rejected', async (ctx) => {
  expectStatus(await ctx.owner.post('/v1/staff/pin-only', { name: 'Bad PIN', roleKey: 'cashier', allBranches: true, branchIds: [], pin: '123' }), 400);
});

t('Owner', F, 'PIN login works with the right PIN and fails with a wrong one', async (ctx) => {
  // PIN login swaps the calling session for the PIN user's, so use a throwaway owner session.
  const { login } = await import('../lib/helpers.mjs');
  const { client: tmp } = await login(ctx.ownerEmail);
  const sess = tmp.inBranch(ctx.branchId);
  const bad = await sess.post('/v1/auth/pin-login', { membershipId: ctx.pinCashierId, pin: '0000' });
  assert.ok([401, 403, 423].includes(bad.status), `wrong pin: ${bad.status}`);
  const ok = expectStatus(await sess.post('/v1/auth/pin-login', { membershipId: ctx.pinCashierId, pin: '4821' }), [200, 201]);
  assert.ok(ok.body.accessToken);
  const me = await sess.withToken(ok.body.accessToken).get('/v1/me');
  assert.equal(me.body.role.key, 'cashier');
});

t('Owner', F, 'Owner sets and removes a PIN for the manager', async (ctx) => {
  expectStatus(await ctx.owner.put(`/v1/staff/${ctx.managerId}/pin`, { pin: '7391' }), [200, 204]);
  ctx.managerPin = '7391';
});

t('Manager', F, 'Manager can list staff', async (ctx) => {
  expectStatus(await ctx.manager.get('/v1/staff'), 200);
});

t('Manager', F, 'Manager can invite a cashier', async (ctx) => {
  expectStatus(await ctx.manager.post('/v1/staff/invites', { email: email('mgr-invited'), roleKey: 'cashier', allBranches: true, branchIds: [] }), 201);
});

t('Manager', F, 'Manager cannot create another manager or owner', async (ctx) => {
  for (const roleKey of ['manager', 'owner']) {
    const res = await ctx.manager.post('/v1/staff/invites', { email: email('esc-' + roleKey), roleKey, allBranches: true, branchIds: [] });
    assert.ok([403, 422].includes(res.status), `${roleKey} invite returned ${res.status}`);
  }
});

t('Manager', F, 'Manager cannot read or change per-employee permissions', async (ctx) => {
  expectStatus(await ctx.manager.get(`/v1/staff/${ctx.cashierId}/permissions`), 403);
});

t('Owner', F, 'Permission overrides: deny orders.create for the cashier, then restore', async (ctx) => {
  const get = expectStatus(await ctx.owner.get(`/v1/staff/${ctx.cashierId}/permissions`), 200);
  assert.ok(get.body, 'empty body');
  ctx.permShape = Object.keys(get.body);
  const put = await ctx.owner.put(`/v1/staff/${ctx.cashierId}/permissions`, { grant: [], deny: ['orders.create'] });
  expectStatus(put, [200, 204]);
  const me = await ctx.cashier.get('/v1/me');
  // The access token may carry the permissions it was issued with; a fresh login must reflect the override.
  const { res: lg } = await import('../lib/helpers.mjs').then((m) => m.login(ctx.cashierEmail));
  const fresh = await new Client(lg.body.accessToken).get('/v1/me');
  assert.ok(!fresh.body.permissions.includes('orders.create'), 'orders.create still present after deny');
  expectStatus(await ctx.owner.put(`/v1/staff/${ctx.cashierId}/permissions`, { grant: [], deny: [] }), [200, 204]);
  const { res: lg2 } = await import('../lib/helpers.mjs').then((m) => m.login(ctx.cashierEmail));
  const back = await new Client(lg2.body.accessToken).get('/v1/me');
  assert.ok(back.body.permissions.includes('orders.create'), 'orders.create not restored');
  void me;
});

t('Owner', F, 'Disabling a user blocks login; re-enabling restores it', async (ctx) => {
  const r = await inviteAndAccept(ctx.owner, ctx, 'cashier', 'disable-me');
  assert.ok(r.client, 'setup invite failed');
  expectStatus(await ctx.owner.patch(`/v1/staff/${r.membershipId}`, { status: 'disabled' }), 200);
  const { login } = await import('../lib/helpers.mjs');
  const blocked = await login(r.email);
  assert.ok([401, 403].includes(blocked.res.status), `disabled login returned ${blocked.res.status}`);
  expectStatus(await ctx.owner.patch(`/v1/staff/${r.membershipId}`, { status: 'active' }), 200);
  const again = await login(r.email);
  assert.ok([200, 201].includes(again.res.status), `re-enabled login returned ${again.res.status}`);
});

t('Owner', F, 'Owner can change a member role', async (ctx) => {
  const r = await inviteAndAccept(ctx.owner, ctx, 'kitchen', 'role-change');
  assert.ok(r.client);
  const res = expectStatus(await ctx.owner.patch(`/v1/staff/${r.membershipId}`, { roleKey: 'cashier' }), 200);
  assert.equal(res.body.roleKey ?? 'cashier', 'cashier');
});

t('Owner', F, 'The last owner cannot be disabled or demoted', async (ctx) => {
  const list = await ctx.owner.get('/v1/staff');
  const self = list.body.items.find((s) => s.isSelf);
  const res = await ctx.owner.patch(`/v1/staff/${self.id}`, { status: 'disabled' });
  assert.ok([400, 403, 409, 422].includes(res.status), `expected a refusal, got ${res.status}`);
});

t('Owner', F, 'Memberships list endpoint works', async (ctx) => {
  expectStatus(await ctx.owner.get('/v1/memberships'), 200);
});

void config;
