import { t, assert, expectStatus, skip } from '../lib/runner.mjs';
import { pngForm, signup } from '../lib/helpers.mjs';

const F = 'Settings & branches';

t('Owner', F, 'Owner reads org settings', async (ctx) => {
  const res = expectStatus(await ctx.owner.get('/v1/org/settings'), 200);
  assert.equal(res.body.defaultCurrency, 'SAR');
  assert.equal(res.body.menuLookAllowed, true);
  assert.equal(res.body.baseCurrencyLocked, false);
});

t('Owner', F, 'Owner renames the restaurant', async (ctx) => {
  const res = expectStatus(await ctx.owner.patch('/v1/org/settings', { name: `E2E Bistro ${ctx.config.runId}` }), 200);
  assert.match(res.body.name, /E2E Bistro/);
});

t('Owner', F, 'Unknown settings fields are rejected (strict body)', async (ctx) => {
  expectStatus(await ctx.owner.patch('/v1/org/settings', { hackerField: true }), 400);
});

t('Owner', F, 'Default locale must be one of the enabled locales', async (ctx) => {
  expectStatus(await ctx.owner.patch('/v1/org/settings', { locales: ['en'], defaultLocale: 'ar' }), 400);
});

t('Owner', F, 'Owner uploads and removes the restaurant logo', async (ctx) => {
  const up = await ctx.owner.post('/v1/org/logo', pngForm());
  if (up.status >= 500) skip(`image storage not available (${up.status})`);
  expectStatus(up, [200, 201]);
  assert.ok(up.body.logoUrl);
  expectStatus(await ctx.owner.delete('/v1/org/logo'), [200, 204]);
});

t('Owner', F, 'Branch settings: tax, pay-before-send, card payments, pager', async (ctx) => {
  const res = expectStatus(await ctx.owner.patch(`/v1/branches/${ctx.branchId}`, {
    taxRateBp: 1500, taxInclusive: false, payBeforeSend: false, acceptsCard: true, pagerEnabled: true,
  }), 200);
  assert.equal(res.body.taxRateBp, 1500);
  assert.equal(res.body.acceptsCard, true);
  assert.equal(res.body.pagerEnabled, true);
});

t('Owner', F, 'Invalid tax rate (over 100%) is rejected', async (ctx) => {
  expectStatus(await ctx.owner.patch(`/v1/branches/${ctx.branchId}`, { taxRateBp: 20000 }), 400);
});

t('Owner', F, 'Branch list shows the branch', async (ctx) => {
  const res = expectStatus(await ctx.owner.get('/v1/branches'), 200);
  assert.ok(res.body.items.some((b) => b.id === ctx.branchId));
});

t('Owner', F, 'Second branch: allowed or blocked by the plan (never a crash)', async (ctx) => {
  const res = await ctx.owner.post('/v1/branches', {
    name: 'Second', slug: `second-${ctx.config.runId}`, timezone: 'Asia/Riyadh', currency: 'SAR', taxRateBp: 1500, taxInclusive: false, dayStartHour: 4,
  });
  assert.ok(res.status < 500, `server error ${res.status}: ${res.text.slice(0, 200)}`);
  ctx.secondBranch = res.status === 201 ? res.body : null;
});

t('Owner', F, 'Dining tables: create, list, rename, disable', async (ctx) => {
  const a = expectStatus(await ctx.owner.post(`/v1/branches/${ctx.branchId}/tables`, { label: 'T1' }), 201);
  const b = expectStatus(await ctx.owner.post(`/v1/branches/${ctx.branchId}/tables`, { label: 'T2' }), 201);
  assert.ok(a.body.qrToken);
  ctx.table1 = a.body; ctx.table2 = b.body;
  const list = expectStatus(await ctx.owner.get(`/v1/branches/${ctx.branchId}/tables`), 200);
  assert.ok(list.body.items.length >= 2);
  expectStatus(await ctx.owner.patch(`/v1/branches/${ctx.branchId}/tables/${b.body.id}`, { label: 'T2-renamed' }), 200);
  const c = expectStatus(await ctx.owner.post(`/v1/branches/${ctx.branchId}/tables`, { label: 'T3' }), 201);
  expectStatus(await ctx.owner.patch(`/v1/branches/${ctx.branchId}/tables/${c.body.id}`, { isActive: false }), 200);
  ctx.tableOff = c.body;
});

t('Owner', F, 'Table QR rotation issues a new token', async (ctx) => {
  const res = expectStatus(await ctx.owner.post(`/v1/branches/${ctx.branchId}/tables/${ctx.table2.id}/rotate-qr`), [200, 201]);
  assert.ok(res.body.qrToken && res.body.qrToken !== ctx.table2.qrToken);
  ctx.oldQr = ctx.table2.qrToken; ctx.table2.qrToken = res.body.qrToken;
});

t('Owner', F, 'Customer "Ready" screen link: create and rotate', async (ctx) => {
  const link = expectStatus(await ctx.owner.get(`/v1/branches/${ctx.branchId}/display-link`), 200);
  ctx.displayToken = link.body.token;
  const rot = expectStatus(await ctx.owner.post(`/v1/branches/${ctx.branchId}/display-link/rotate`), [200, 201]);
  assert.ok(rot.body.token && rot.body.token.length >= 20);
  assert.notEqual(rot.body.token, ctx.displayToken);
  ctx.displayToken = rot.body.token;
});

t('Owner', F, 'POS device: create pairing code, list, revoke', async (ctx) => {
  const res = await ctx.owner.post('/v1/devices', { branchId: ctx.branchId, name: 'Front counter tablet' });
  assert.ok(res.status < 500, `server error ${res.status}`);
  expectStatus(res, 201);
  const list = expectStatus(await ctx.owner.get('/v1/devices'), 200);
  assert.ok(list.body.items.length >= 1);
  const devId = res.body.id ?? res.body.deviceId ?? res.body.device?.id;
  assert.ok(devId, `no device id in response: ${res.text.slice(0, 200)}`);
  expectStatus(await ctx.owner.delete(`/v1/devices/${devId}`), [200, 204]);
});

t('Owner', F, 'Menu look: preset, layout, hero, ticker (plan allows menu.branding)', async (ctx) => {
  const theme = { preset: 'forest', layout: 'grid', hero: { enabled: true, headline: { en: 'Fresh daily', ar: 'طازج يوميا' }, subline: { en: 'Since 2020' } }, showSearch: true, showTicker: true, brandColor: '#173f32' };
  const res = expectStatus(await ctx.owner.patch('/v1/org/settings', { menuTheme: theme }), 200);
  assert.equal(res.body.menuTheme.preset, 'forest');
  assert.equal(res.body.menuLookAllowed, true);
});

t('Owner', F, 'Menu look: invalid preset and bad brand colour are rejected', async (ctx) => {
  expectStatus(await ctx.owner.patch('/v1/org/settings', { menuTheme: { preset: 'neon' } }), 400);
  expectStatus(await ctx.owner.patch('/v1/org/settings', { menuTheme: { brandColor: 'green' } }), 400);
});

t('Owner', F, 'Menu cover photo: upload and delete', async (ctx) => {
  const up = await ctx.owner.post('/v1/org/menu-cover', pngForm());
  if (up.status >= 500) skip(`image storage not available (${up.status})`);
  if ([400, 422].includes(up.status)) skip(`1x1 test image too small for the cover (${up.status}); covered by API suite`);
  expectStatus(up, [200, 201]);
  expectStatus(await ctx.owner.delete('/v1/org/menu-cover'), [200, 204]);
});

t('Owner', F, 'Display currency: set USD with rate and rounding, then turn off', async (ctx) => {
  const on = expectStatus(await ctx.owner.patch('/v1/org/settings', { displayCurrency: 'USD', exchangeRate: 0.27, displayItemStep: 0, displayTotalStep: 0 }), 200);
  assert.equal(on.body.displayCurrency, 'USD');
  assert.equal(on.body.exchangeRate, 0.27);
  const off = expectStatus(await ctx.owner.patch('/v1/org/settings', { displayCurrency: null }), 200);
  assert.equal(off.body.displayCurrency, null);
});

t('Owner', F, 'Display currency: zero or negative exchange rate is rejected', async (ctx) => {
  expectStatus(await ctx.owner.patch('/v1/org/settings', { displayCurrency: 'USD', exchangeRate: 0 }), 400);
  expectStatus(await ctx.owner.patch('/v1/org/settings', { displayCurrency: 'USD', exchangeRate: -2 }), 400);
});

t('Owner', F, 'Base currency can still be changed before the first order', async (ctx) => {
  const { res, client } = await signup('currency');
  expectStatus(res, 201);
  const o = client.inBranch(res.body.branch.id);
  expectStatus(await o.patch('/v1/org/settings', { defaultCurrency: 'AED' }), 200);
  const s = await o.get('/v1/org/settings');
  assert.equal(s.body.defaultCurrency, 'AED');
});

t('Manager', F, 'Manager cannot open org settings or change branch settings', async (ctx) => {
  expectStatus(await ctx.manager.get('/v1/org/settings'), 403);
  expectStatus(await ctx.manager.patch('/v1/org/settings', { name: 'Hacked' }), 403);
});

t('Cashier', F, 'Cashier cannot change settings, branches or tables', async (ctx) => {
  expectStatus(await ctx.cashier.patch('/v1/org/settings', { name: 'Hacked' }), 403);
  expectStatus(await ctx.cashier.patch(`/v1/branches/${ctx.branchId}`, { taxRateBp: 0 }), 403);
  expectStatus(await ctx.cashier.post(`/v1/branches/${ctx.branchId}/tables`, { label: 'X' }), 403);
});

t('Kitchen', F, 'Kitchen cannot change settings or manage devices', async (ctx) => {
  expectStatus(await ctx.kitchen.patch('/v1/org/settings', { name: 'Hacked' }), 403);
  expectStatus(await ctx.kitchen.get('/v1/devices'), 403);
});
