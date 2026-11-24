import { t, assert, expectStatus } from '../lib/runner.mjs';
import { Client } from '../lib/http.mjs';

const F = 'Billing & plans';

t('Owner', F, 'Billing overview lists the four plans and the current trial entitlements', async (ctx) => {
  const res = expectStatus(await ctx.owner.get('/v1/billing'), 200);
  const keys = res.body.plans.map((p) => p.key);
  for (const k of ['free', 'menu', 'restaurant', 'business']) assert.ok(keys.includes(k), `missing plan ${k}`);
  assert.equal(res.body.entitlements.planKey, 'restaurant');
  assert.equal(res.body.entitlements.status, 'trialing');
  ctx.plans = res.body.plans;
});

t('Owner', F, 'Plan feature lists match the product matrix (POS/KDS only from Restaurant up)', async (ctx) => {
  const by = Object.fromEntries(ctx.plans.map((p) => [p.key, p.features]));
  assert.ok(!by.free.includes('pos.access') && !by.menu.includes('pos.access'));
  assert.ok(by.restaurant.includes('pos.access') && by.restaurant.includes('kds.access'));
  assert.ok(by.menu.includes('menu.branding') && !by.free.includes('menu.branding'));
  assert.ok(by.business.includes('branches.multi'));
});

t('Owner', F, 'Plans are returned in price order', async (ctx) => {
  const prices = ctx.plans.map((p) => p.priceMinor);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
});

t('Owner', F, 'Checkout for a plan answers cleanly (success or "not configured", never a crash)', async (ctx) => {
  const res = await ctx.owner.post('/v1/billing/checkout', { planKey: 'restaurant' });
  assert.ok(res.status < 500, `server error ${res.status}: ${res.text.slice(0, 200)}`);
});

t('Owner', F, 'Checkout with an unknown plan key is rejected', async (ctx) => {
  expectStatus(await ctx.owner.post('/v1/billing/checkout', { planKey: 'platinum' }), 400);
});

t('Owner', F, 'Billing portal answers cleanly without a subscription', async (ctx) => {
  const res = await ctx.owner.post('/v1/billing/portal');
  assert.ok(res.status < 500, `server error ${res.status}`);
});

t('Anonymous', F, 'Paddle webhook rejects unsigned requests', async () => {
  const res = await new Client().post('/v1/billing/webhooks/paddle', { event_type: 'subscription.created' });
  assert.ok([400, 401].includes(res.status), `got ${res.status}`);
});

t('Manager', F, 'Manager cannot see or change billing', async (ctx) => {
  expectStatus(await ctx.manager.get('/v1/billing'), 403);
  expectStatus(await ctx.manager.post('/v1/billing/checkout', { planKey: 'restaurant' }), 403);
});

t('Cashier', F, 'Cashier cannot see billing', async (ctx) => {
  expectStatus(await ctx.cashier.get('/v1/billing'), 403);
});

t('Kitchen', F, 'Kitchen cannot see billing', async (ctx) => {
  expectStatus(await ctx.kitchen.get('/v1/billing'), 403);
});
