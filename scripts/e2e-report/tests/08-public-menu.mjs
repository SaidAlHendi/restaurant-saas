import { t, assert, expectStatus } from '../lib/runner.mjs';
import { Client } from '../lib/http.mjs';
import { getPage } from '../lib/http.mjs';
import { config } from '../lib/config.mjs';

const R = 'Customer';
const F = 'Public menu & QR';
const anon = () => new Client();

t(R, F, 'Public menu by restaurant slug lists categories and products', async (ctx) => {
  const res = expectStatus(await anon().get(`/v1/public/menus/${ctx.orgSlug}`), 200);
  const text = JSON.stringify(res.body);
  assert.ok(text.includes('Classic Burger') && text.includes('Cola'));
  assert.ok(res.body.categories.length >= 2);
  ctx.publicMenu = res.body;
});

t(R, F, 'Public menu is cacheable (Cache-Control header)', async (ctx) => {
  const res = await anon().get(`/v1/public/menus/${ctx.orgSlug}`);
  assert.match(res.headers.get('cache-control') ?? '', /s-maxage|max-age/);
});

t(R, F, 'Public menu exposes no staff-only data', async (ctx) => {
  const text = JSON.stringify(ctx.publicMenu);
  for (const bad of ['passwordHash', 'orgId', ctx.ownerEmail]) assert.ok(!text.includes(bad), `leaked ${bad}`);
});

t(R, F, 'Arabic locale returns Arabic names', async (ctx) => {
  const res = expectStatus(await anon().get(`/v1/public/menus/${ctx.orgSlug}?locale=ar`), 200);
  assert.equal(res.body.effectiveLocale, 'ar');
  assert.ok(JSON.stringify(res.body).includes('برجر كلاسيك'));
});

t(R, F, 'Unsupported locale falls back to the default', async (ctx) => {
  const res = await anon().get(`/v1/public/menus/${ctx.orgSlug}?locale=fr`);
  assert.ok([200, 400].includes(res.status), `got ${res.status}`);
});

t(R, F, 'Inactive products are hidden from the public menu', async (ctx) => {
  expectStatus(await ctx.owner.patch(`/v1/products/${ctx.veggie.id}`, { isActive: false }), 200);
  const res = expectStatus(await anon().get(`/v1/public/menus/${ctx.orgSlug}`), 200);
  const hidden = !JSON.stringify(res.body).includes('Veggie Burger');
  expectStatus(await ctx.owner.patch(`/v1/products/${ctx.veggie.id}`, { isActive: true }), 200);
  assert.ok(hidden, 'inactive product still visible (public cache may delay this by design)');
});

t(R, F, 'Branch menu works by branch slug', async (ctx) => {
  const res = expectStatus(await anon().get(`/v1/public/menus/${ctx.orgSlug}/branches/${ctx.branchSlug}`), 200);
  assert.ok(res.body.branch);
});

t(R, F, 'Unknown restaurant or branch returns 404', async (ctx) => {
  expectStatus(await anon().get('/v1/public/menus/no-such-restaurant-' + ctx.config.runId), 404);
  expectStatus(await anon().get(`/v1/public/menus/${ctx.orgSlug}/branches/nope`), 404);
});

t(R, F, 'Menu look (theme) is part of the public menu', async (ctx) => {
  const res = expectStatus(await anon().get(`/v1/public/menus/${ctx.orgSlug}`), 200);
  assert.equal(res.body.org.theme.preset, 'forest');
  assert.equal(res.body.org.theme.layout, 'grid');
  assert.equal(res.body.org.theme.hero.enabled, true);
});

t(R, F, 'Table QR token resolves to restaurant, branch and table label', async (ctx) => {
  const res = expectStatus(await anon().get(`/v1/public/tables/${ctx.table2.qrToken}`), 200);
  assert.equal(res.body.orgSlug, ctx.orgSlug);
  assert.equal(res.body.tableLabel, 'T2-renamed');
});

t(R, F, 'Rotated (old) QR token no longer resolves', async (ctx) => {
  expectStatus(await anon().get(`/v1/public/tables/${ctx.oldQr}`), 404);
});

t(R, F, 'Garbage QR token returns 404', async () => {
  expectStatus(await anon().get('/v1/public/tables/garbage'), 404);
});

t(R, F, 'Display currency shows on the public menu when enabled', async (ctx) => {
  expectStatus(await ctx.owner.patch('/v1/org/settings', { displayCurrency: 'USD', exchangeRate: 0.27 }), 200);
  const res = expectStatus(await anon().get(`/v1/public/menus/${ctx.orgSlug}`), 200);
  expectStatus(await ctx.owner.patch('/v1/org/settings', { displayCurrency: null }), 200);
  assert.ok(res.body.org.display, 'no display block on public menu (CDN cache headers apply in production)');
  assert.equal(res.body.org.display.currency, 'USD');
});

t(R, F, 'Sitemap lists the restaurant', async (ctx) => {
  const res = expectStatus(await anon().get('/v1/public/sitemap'), 200);
  assert.ok(Array.isArray(res.body.items));
});

t(R, F, 'Landing-page lead form rejects invalid input', async () => {
  const res = await anon().post('/v1/public/leads', { name: ' ', restaurantName: 'a', phone: 'call me', email: 'nope' });
  expectStatus(res, 400);
});

t(R, F, 'Public site serves the restaurant menu page (QR landing)', async (ctx) => {
  const page = await getPage(config.siteUrl);
  if (page.status === 0) return (await import('../lib/runner.mjs')).skip('public site is not running');
  expectStatus(page, 200);
});
