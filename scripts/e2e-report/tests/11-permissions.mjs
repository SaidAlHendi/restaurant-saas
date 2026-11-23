import { t, assert } from '../lib/runner.mjs';
import { Client, uuid } from '../lib/http.mjs';

// Role x endpoint matrix. `allow` lists the roles that must get through; everyone else must get 403.
// Only reads (and writes with a deliberately invalid body, which a permitted role answers with 400)
// are used, so the matrix never changes data.
const B = (ctx) => `/v1/branches/${ctx.branchId}`;
const MATRIX = [
  ['List products', 'GET', () => '/v1/products', null, ['owner', 'manager', 'cashier']],
  ['List categories', 'GET', () => '/v1/categories', null, ['owner', 'manager', 'cashier']],
  ['List modifier groups', 'GET', () => '/v1/modifier-groups', null, ['owner', 'manager', 'cashier']],
  ['Create category (invalid body)', 'POST', () => '/v1/categories', {}, ['owner', 'manager']],
  ['Create modifier group (invalid body)', 'POST', () => '/v1/modifier-groups', {}, ['owner', 'manager']],
  ['List branches', 'GET', () => '/v1/branches', null, ['owner', 'manager', 'cashier']],
  ['Update branch settings', 'PATCH', (c) => `/v1/branches/${c.branchId}`, { taxRateBp: 99999 }, ['owner']],
  ['List tables', 'GET', (c) => `${B(c)}/tables`, null, ['owner', 'manager', 'cashier']],
  ['Create table (invalid body)', 'POST', (c) => `${B(c)}/tables`, {}, ['owner']],
  ['Read org settings', 'GET', () => '/v1/org/settings', null, ['owner']],
  ['Read billing', 'GET', () => '/v1/billing', null, ['owner']],
  ['List staff', 'GET', () => '/v1/staff', null, ['owner', 'manager']],
  ['Invite staff (invalid body)', 'POST', () => '/v1/staff/invites', {}, ['owner', 'manager']],
  ['Read employee permissions', 'GET', (c) => `/v1/staff/${c.cashierId}/permissions`, null, ['owner']],
  ['List POS devices', 'GET', () => '/v1/devices', null, ['owner', 'manager']],
  ['Read display link', 'GET', (c) => `${B(c)}/display-link`, null, ['owner']],
  ['List orders', 'GET', (c) => `${B(c)}/orders`, null, ['owner', 'manager', 'cashier', 'kitchen']],
  ['Create order (invalid body)', 'POST', (c) => `${B(c)}/orders`, {}, ['owner', 'manager', 'cashier']],
  ['POS menu', 'GET', (c) => `${B(c)}/pos/menu`, null, ['owner', 'manager', 'cashier']],
  ['Kitchen board', 'GET', (c) => `${B(c)}/kitchen/board`, null, ['owner', 'manager', 'cashier', 'kitchen']],
  ['List bills', 'GET', (c) => `${B(c)}/bills`, null, ['owner', 'manager', 'cashier', 'kitchen']],
  ['Daily report', 'GET', (c) => `${B(c)}/reports/daily`, null, ['owner', 'manager']],
];
const ROLES = ['owner', 'manager', 'cashier', 'kitchen'];
const label = { owner: 'Owner', manager: 'Manager', cashier: 'Cashier', kitchen: 'Kitchen' };

for (const [name, method, path, body, allow] of MATRIX) {
  for (const role of ROLES) {
    const allowed = allow.includes(role);
    t(label[role], 'Permission matrix', `${name}: ${allowed ? 'allowed' : 'denied'}`, async (ctx) => {
      const client = ctx[role];
      const res = await client.request(method, path(ctx), body === null ? {} : { body });
      if (allowed) assert.ok(![401, 403].includes(res.status) && res.status < 500, `expected access, got ${res.status} ${res.text.slice(0, 120)}`);
      else assert.equal(res.status, 403, `expected 403, got ${res.status} ${res.text.slice(0, 120)}`);
    });
  }
}

t('Anonymous', 'Permission matrix', 'Every protected endpoint refuses a request without a token', async (ctx) => {
  const anon = new Client();
  const bad = [];
  for (const [name, method, path, body] of MATRIX) {
    const res = await anon.request(method, path(ctx), body === null ? {} : { body });
    if (res.status !== 401) bad.push(`${name} -> ${res.status}`);
  }
  assert.equal(bad.length, 0, bad.join('; '));
});

void uuid;
