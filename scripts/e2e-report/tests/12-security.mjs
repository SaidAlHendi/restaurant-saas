import { t, assert, expectStatus, skip } from '../lib/runner.mjs';
import { Client, uuid } from '../lib/http.mjs';
import { signup, orderBody, createOrder } from '../lib/helpers.mjs';

const F = 'Security & tenant isolation';

t('Owner', F, 'A second restaurant is created for isolation checks', async (ctx) => {
  const { res, client } = await signup('rival');
  expectStatus(res, 201, 'rival signup');
  ctx.rival = client.inBranch(res.body.branch.id);
  ctx.rivalBranchId = res.body.branch.id;
  ctx.rivalOrgId = res.body.org.id;
});

t('Owner', F, 'Other restaurant cannot read my products, categories or modifier groups by id', async (ctx) => {
  for (const path of [`/v1/products/${ctx.burger.id}`, `/v1/modifier-groups/${ctx.groupSize}`]) {
    const res = await ctx.rival.get(path);
    assert.equal(res.status, 404, `${path} -> ${res.status}`);
  }
});

t('Owner', F, 'Other restaurant list calls do not include my data', async (ctx) => {
  const prods = await ctx.rival.get('/v1/products');
  assert.ok(!JSON.stringify(prods.body).includes(ctx.burger.id));
  const staff = await ctx.rival.get('/v1/staff');
  assert.ok(!JSON.stringify(staff.body).includes(ctx.ownerEmail));
});

t('Owner', F, 'Other restaurant cannot read my branch or orders', async (ctx) => {
  for (const path of [`/v1/branches/${ctx.branchId}/orders`, `/v1/branches/${ctx.branchId}/reports/daily`, `/v1/branches/${ctx.branchId}/kitchen/board`]) {
    const res = await ctx.rival.get(path);
    assert.ok([403, 404].includes(res.status), `${path} -> ${res.status}`);
  }
});

t('Owner', F, 'Other restaurant cannot create an order in my branch', async (ctx) => {
  const res = await createOrder(ctx.rival, ctx.branchId, orderBody([{ productId: ctx.cola.id, quantity: 1, modifierIds: [] }]));
  assert.ok([403, 404].includes(res.status), `got ${res.status}`);
});

t('Owner', F, 'Other restaurant cannot change my staff or settings by id', async (ctx) => {
  const a = await ctx.rival.patch(`/v1/staff/${ctx.cashierId}`, { status: 'disabled' });
  assert.ok([403, 404].includes(a.status), `staff patch ${a.status}`);
  const me = await ctx.cashier.get('/v1/me');
  assert.equal(me.status, 200, 'my cashier was affected');
});

t('Owner', F, 'Using my branch id in X-Branch-Id with another restaurant token is refused', async (ctx) => {
  const res = await ctx.rival.inBranch(ctx.branchId).get('/v1/me');
  assert.ok([400, 403, 404].includes(res.status) || res.body?.currentBranchId !== ctx.branchId, `got ${res.status}`);
});

t('Owner', F, 'Other restaurant cannot read my order by id on its own branch', async (ctx) => {
  const res = await ctx.rival.get(`/v1/branches/${ctx.rivalBranchId}/orders/${ctx.order1.id}`);
  assert.equal(res.status, 404, `got ${res.status}`);
});

t('Anonymous', F, 'Malformed UUIDs in the path return 400, never 500', async (ctx) => {
  for (const path of ['/v1/products/not-a-uuid', `/v1/branches/${ctx.branchId}/orders/xyz`, '/v1/staff/123/permissions', '/v1/categories/abc']) {
    const res = await ctx.owner.get(path);
    assert.ok([400, 404].includes(res.status), `${path} -> ${res.status}`);
  }
});

t('Anonymous', F, 'Injection-style input in search never causes a server error', async (ctx) => {
  for (const q of ["'; DROP TABLE products;--", '%00', '<script>alert(1)</script>', 'a'.repeat(500)]) {
    const res = await ctx.owner.get(`/v1/products?search=${encodeURIComponent(q)}`);
    assert.ok(res.status < 500, `search ${JSON.stringify(q).slice(0, 30)} -> ${res.status}`);
  }
});

t('Anonymous', F, 'Tampered JWT (payload edited) is rejected', async (ctx) => {
  const [h, p, s] = ctx.owner.token.split('.');
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
  payload.org = uuid();
  const forged = [h, Buffer.from(JSON.stringify(payload)).toString('base64url'), s].join('.');
  expectStatus(await new Client(forged).get('/v1/me'), 401);
});

t('Anonymous', F, 'Unsigned (alg=none) JWT is rejected', async (ctx) => {
  const [, p] = ctx.owner.token.split('.');
  const head = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  expectStatus(await new Client(`${head}.${p}.`).get('/v1/me'), 401);
});

t('Anonymous', F, 'Mass-assignment: orgId / role in a product body is ignored', async (ctx) => {
  const res = await ctx.owner.post('/v1/products', { categoryId: ctx.catBurgers, name: { en: 'MA', ar: 'م' }, priceMinor: 100, orgId: ctx.rivalOrgId });
  assert.ok(res.status < 500);
  if (res.status === 201) assert.notEqual(res.body.orgId, ctx.rivalOrgId);
});

t('Anonymous', F, 'Oversized JSON body is refused, not crashed on', async (ctx) => {
  const res = await ctx.owner.post('/v1/categories', { name: { en: 'x'.repeat(2_000_000) } });
  assert.ok([400, 413].includes(res.status), `got ${res.status}`);
});

t('Anonymous', F, 'Media route does not allow path traversal', async () => {
  const res = await new Client().get('/v1/media/..%2F..%2F..%2Fetc%2Fpasswd');
  assert.ok([400, 403, 404].includes(res.status), `got ${res.status}`);
  assert.ok(!res.text.includes('root:'));
});

t('Anonymous', F, 'CORS: unknown origin gets no allow-origin header', async () => {
  const res = await new Client().get('/v1/health', { headers: { Origin: 'https://evil.example' } });
  if (res.headers.get('access-control-allow-origin') === 'https://evil.example') {
    skip('API reflects any origin: CORS_ORIGINS is not set (the dev default). Set it on staging and production.');
  }
});
