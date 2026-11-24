import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { t, assert, expectStatus, skip } from '../lib/runner.mjs';
import { Client } from '../lib/http.mjs';
import { config } from '../lib/config.mjs';
import { signup, email } from '../lib/helpers.mjs';

// Real-browser check of the front-end screens: log in as an owner in Chromium, open a screen, change
// the data through the API from "somewhere else", and require the open screen to update by itself
// (no reload, no click). Needs the web app running (WEB_URL) and Playwright. Skipped otherwise.
const F = 'Browser: screens update live';
const WAIT = Number(process.env.E2E_UI_MS ?? 6000);
let pw = null;
try { pw = createRequire('/opt/node-tools/')('playwright'); } catch { /* skipped */ }
try { pw ??= createRequire(import.meta.url)('playwright'); } catch { /* skipped */ }

const need = () => { if (!pw) skip('Playwright not installed'); };
const shots = new URL('../reports/screens/', import.meta.url).pathname;
const S = {}; // browser, page, owner client, names

async function ready() {
  need();
  if (S.page) return S;
  try { await fetch(config.webUrl, { signal: AbortSignal.timeout(3000) }); } catch { skip(`web app not reachable at ${config.webUrl}`); }
  mkdirSync(shots, { recursive: true });
  const s = await signup('ui');
  assert.ok(s.res.body?.accessToken, 'signup failed');
  S.owner = s.client.inBranch(s.res.body.branch.id);
  S.orgId = s.res.body.org.id;
  S.branchId = s.res.body.branch.id;
  S.browser = await pw.chromium.launch();
  S.page = await S.browser.newPage({ viewport: { width: 1280, height: 800 } });
  await S.page.goto(`${config.webUrl}/login`);
  await S.page.fill('input[name=email]', email('ui'));
  await S.page.fill('input[name=password]', config.password);
  await S.page.click('button[type=submit]');
  await S.page.waitForURL(/\/(dashboard|pos|kds)/, { timeout: 15000 });
  return S;
}

async function open(path) {
  const { page } = await ready();
  await page.goto(`${config.webUrl}${path}`);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500); // let the screen's own socket connect
}

async function seeWithoutReload(text, shot) {
  const { page } = S;
  try {
    await page.getByText(text, { exact: false }).first().waitFor({ timeout: WAIT });
  } catch {
    await page.screenshot({ path: `${shots}${shot}-FAILED.png` });
    assert.fail(`"${text}" did not appear on the open screen within ${WAIT} ms (no reload)`);
  }
  await page.screenshot({ path: `${shots}${shot}.png` });
}

const uniq = (p) => `${p}${config.runId.replace(/[^a-z0-9]/gi, '').slice(0, 6)}`;

t('Owner', F, 'Dashboard > Staff: a new PIN-only employee appears without reload', async () => {
  await open('/dashboard/staff'); const name = uniq('Zstaff');
  expectStatus(await S.owner.post('/v1/staff/pin-only', { name, roleKey: 'cashier', allBranches: true, branchIds: [], pin: '4821' }), 201);
  await seeWithoutReload(name, 'staff');
});

t('Owner', F, 'Dashboard > Devices: a new POS device appears without reload', async () => {
  await open('/dashboard/devices'); const name = uniq('Zdevice');
  expectStatus(await S.owner.post('/v1/devices', { branchId: S.branchId, name }), 201);
  await seeWithoutReload(name, 'devices');
});

t('Owner', F, 'Dashboard > Menu > Tables: a new table appears without reload', async () => {
  await open('/dashboard/menu/tables'); const label = uniq('Ztable');
  expectStatus(await S.owner.post(`/v1/branches/${S.branchId}/tables`, { label }), 201);
  await seeWithoutReload(label, 'tables');
});

t('Owner', F, 'Dashboard > Menu > Categories: a new category appears without reload', async () => {
  await open('/dashboard/menu/categories'); const en = uniq('Zcat');
  expectStatus(await S.owner.post('/v1/categories', { name: { en } }), 201);
  await seeWithoutReload(en, 'categories');
});

t('Owner', F, 'Dashboard: renaming the restaurant updates the open screen', async () => {
  await open('/dashboard/settings/restaurant'); const name = uniq('Zrestaurant');
  expectStatus(await S.owner.patch('/v1/org/settings', { name }), 200);
  await seeWithoutReload(name, 'restaurant-name');
});

t('Owner', F, 'POS > Tables: a new table appears without reload', async () => {
  await open('/pos/tables'); const label = uniq('Zpos');
  expectStatus(await S.owner.post(`/v1/branches/${S.branchId}/tables`, { label }), 201);
  await seeWithoutReload(label, 'pos-tables');
});

t('Platform admin', F, 'A plan change reaches the open Billing screen without reload', async (ctx) => {
  if (!config.adminEmail) skip('no platform admin credentials');
  await open('/dashboard/billing');
  const before = await S.page.innerText('main').catch(() => S.page.innerText('body'));
  const admin = new Client();
  const login = await admin.post('/v1/admin/auth/login', { email: config.adminEmail, password: config.adminPassword });
  assert.ok(login.body?.accessToken, 'admin login failed');
  const a = new Client(login.body.accessToken);
  expectStatus(await a.post(`/v1/admin/orgs/${S.orgId}/activate`, { planKey: 'business', until: new Date(Date.now() + 30 * 86400_000).toISOString(), paid: false, note: 'e2e ui' }), 200);
  const start = Date.now(); let after = before;
  while (Date.now() - start < WAIT && after === before) { await S.page.waitForTimeout(250); after = await S.page.innerText('main').catch(() => S.page.innerText('body')); }
  await S.page.screenshot({ path: `${shots}billing.png` });
  assert.notEqual(after, before, 'Billing screen did not change after the admin changed the plan (no reload)');
  await a.post('/v1/admin/auth/logout', {}).catch(() => {});
});

t('Owner', F, 'Closing the browser', async () => {
  if (S.browser) await S.browser.close();
  S.page = null;
});
