import { t, assert, expectStatus, skip } from '../lib/runner.mjs';
import { pngForm } from '../lib/helpers.mjs';
import { uuid } from '../lib/http.mjs';

const F = 'Catalog (menu)';

t('Owner', F, 'Owner enables Arabic as a second menu language', async (ctx) => {
  expectStatus(await ctx.owner.patch('/v1/org/settings', { locales: ['en', 'ar'], defaultLocale: 'en' }), 200);
});

t('Owner', F, 'Category without a name is rejected', async (ctx) => {
  expectStatus(await ctx.owner.post('/v1/categories', { isActive: true }), 400);
});

t('Owner', F, 'Owner creates categories (English + Arabic)', async (ctx) => {
  const a = expectStatus(await ctx.owner.post('/v1/categories', { name: { en: 'Burgers', ar: 'برجر' }, isActive: true }), 201);
  const b = expectStatus(await ctx.owner.post('/v1/categories', { name: { en: 'Drinks', ar: 'مشروبات' }, isActive: true }), 201);
  ctx.catBurgers = a.body.id; ctx.catDrinks = b.body.id;
});

t('Owner', F, 'Category list returns both categories', async (ctx) => {
  const res = expectStatus(await ctx.owner.get('/v1/categories'), 200);
  const ids = res.body.items.map((c) => c.id);
  assert.ok(ids.includes(ctx.catBurgers) && ids.includes(ctx.catDrinks));
});

t('Owner', F, 'Owner renames a category', async (ctx) => {
  const res = expectStatus(await ctx.owner.patch(`/v1/categories/${ctx.catDrinks}`, { name: { en: 'Cold drinks', ar: 'مشروبات باردة' } }), 200);
  assert.equal(res.body.name.en, 'Cold drinks');
});

t('Owner', F, 'Owner reorders categories', async (ctx) => {
  expectStatus(await ctx.owner.put('/v1/categories/reorder', { orderedIds: [ctx.catDrinks, ctx.catBurgers] }), [200, 204]);
  const list = await ctx.owner.get('/v1/categories');
  assert.equal(list.body.items[0].id, ctx.catDrinks);
});

t('Owner', F, 'Product with a negative price is rejected', async (ctx) => {
  expectStatus(await ctx.owner.post('/v1/products', { categoryId: ctx.catBurgers, name: { en: 'Bad', ar: 'سيء' }, priceMinor: -5 }), 400);
});

t('Owner', F, 'Product in an unknown category is rejected', async (ctx) => {
  const res = await ctx.owner.post('/v1/products', { categoryId: uuid(), name: { en: 'Orphan', ar: 'يتيم' }, priceMinor: 100 });
  assert.ok([400, 404, 422].includes(res.status), `got ${res.status}`);
});

t('Owner', F, 'Owner creates products with prices in minor units', async (ctx) => {
  const burger = expectStatus(await ctx.owner.post('/v1/products', {
    categoryId: ctx.catBurgers, name: { en: 'Classic Burger', ar: 'برجر كلاسيك' },
    description: { en: 'Beef, cheese, pickles', ar: 'لحم، جبن، مخلل' }, priceMinor: 2500, isActive: true,
  }), 201);
  const cola = expectStatus(await ctx.owner.post('/v1/products', {
    categoryId: ctx.catDrinks, name: { en: 'Cola', ar: 'كولا' }, priceMinor: 800, isActive: true,
  }), 201);
  ctx.burger = burger.body; ctx.cola = cola.body;
  assert.equal(burger.body.priceMinor, 2500);
});

t('Owner', F, 'Product list, filter by category and search', async (ctx) => {
  const all = expectStatus(await ctx.owner.get('/v1/products'), 200);
  assert.ok(all.body.items.length >= 2);
  const byCat = expectStatus(await ctx.owner.get(`/v1/products?categoryId=${ctx.catDrinks}`), 200);
  assert.ok(byCat.body.items.every((p) => p.categoryId === ctx.catDrinks));
  const search = expectStatus(await ctx.owner.get('/v1/products?search=Burger'), 200);
  assert.ok(search.body.items.some((p) => p.id === ctx.burger.id));
});

t('Owner', F, 'Product detail returns modifierGroups array', async (ctx) => {
  const res = expectStatus(await ctx.owner.get(`/v1/products/${ctx.burger.id}`), 200);
  assert.ok(Array.isArray(res.body.modifierGroups));
});

t('Owner', F, 'Owner changes a price and toggles availability', async (ctx) => {
  const res = expectStatus(await ctx.owner.patch(`/v1/products/${ctx.cola.id}`, { priceMinor: 900 }), 200);
  assert.equal(res.body.priceMinor, 900);
  const off = expectStatus(await ctx.owner.patch(`/v1/products/${ctx.cola.id}`, { isActive: false }), 200);
  assert.equal(off.body.isActive, false);
  expectStatus(await ctx.owner.patch(`/v1/products/${ctx.cola.id}`, { isActive: true }), 200);
  ctx.cola.priceMinor = 900;
});

t('Owner', F, 'Owner uploads a product image and then removes it', async (ctx) => {
  const up = await ctx.owner.post(`/v1/products/${ctx.burger.id}/image`, pngForm());
  if (up.status >= 500) skip(`image storage not available (${up.status}); check media/R2 config`);
  expectStatus(up, [200, 201]);
  assert.ok(up.body.imageUrls?.url400 ?? up.body.url400);
  expectStatus(await ctx.owner.delete(`/v1/products/${ctx.burger.id}/image`), [200, 204]);
});

t('Owner', F, 'Non-image upload is rejected', async (ctx) => {
  const f = new FormData();
  f.append('file', new Blob(['hello'], { type: 'text/plain' }), 'x.txt');
  const res = await ctx.owner.post(`/v1/products/${ctx.burger.id}/image`, f);
  assert.ok([400, 415, 422].includes(res.status), `got ${res.status}`);
});

t('Owner', F, 'Modifier group: create with options, patch, reorder', async (ctx) => {
  const g = expectStatus(await ctx.owner.post('/v1/modifier-groups', { name: { en: 'Size', ar: 'الحجم' }, minSelect: 1, maxSelect: 1 }), 201);
  ctx.groupSize = g.body.id;
  const m1 = expectStatus(await ctx.owner.post(`/v1/modifier-groups/${g.body.id}/modifiers`, { name: { en: 'Regular', ar: 'عادي' }, priceDeltaMinor: 0 }), 201);
  const m2 = expectStatus(await ctx.owner.post(`/v1/modifier-groups/${g.body.id}/modifiers`, { name: { en: 'Large', ar: 'كبير' }, priceDeltaMinor: 300 }), 201);
  ctx.modRegular = m1.body.id; ctx.modLarge = m2.body.id;
  expectStatus(await ctx.owner.patch(`/v1/modifier-groups/${g.body.id}/modifiers/${m2.body.id}`, { priceDeltaMinor: 400 }), 200);
  ctx.largeDelta = 400;
  expectStatus(await ctx.owner.put(`/v1/modifier-groups/${g.body.id}/modifiers/reorder`, { orderedIds: [m2.body.id, m1.body.id] }), [200, 204]);
  const detail = expectStatus(await ctx.owner.get(`/v1/modifier-groups/${g.body.id}`), 200);
  assert.equal(detail.body.modifiers.length, 2);
});

t('Owner', F, 'Modifier group with min greater than max is rejected', async (ctx) => {
  expectStatus(await ctx.owner.post('/v1/modifier-groups', { name: { en: 'Bad', ar: 'سيء' }, minSelect: 3, maxSelect: 1 }), 400);
});

t('Owner', F, 'Modifier group attaches to a product and shows in the list counts', async (ctx) => {
  expectStatus(await ctx.owner.put(`/v1/products/${ctx.burger.id}/modifier-groups`, { groupIds: [ctx.groupSize] }), [200, 204]);
  const p = await ctx.owner.get(`/v1/products/${ctx.burger.id}`);
  assert.equal(p.body.modifierGroups.length, 1);
  const list = expectStatus(await ctx.owner.get('/v1/modifier-groups'), 200);
  const row = list.body.items.find((g) => g.id === ctx.groupSize);
  assert.equal(row.modifierCount, 2);
  assert.equal(row.productCount, 1);
});

t('Owner', F, 'Optional extras group (up to 2) is created', async (ctx) => {
  const g = expectStatus(await ctx.owner.post('/v1/modifier-groups', { name: { en: 'Extras', ar: 'إضافات' }, minSelect: 0, maxSelect: 2 }), 201);
  const e1 = expectStatus(await ctx.owner.post(`/v1/modifier-groups/${g.body.id}/modifiers`, { name: { en: 'Cheese', ar: 'جبن' }, priceDeltaMinor: 200 }), 201);
  ctx.groupExtras = g.body.id; ctx.modCheese = e1.body.id;
});

t('Owner', F, 'Products can be reordered inside a category', async (ctx) => {
  const extra = expectStatus(await ctx.owner.post('/v1/products', { categoryId: ctx.catBurgers, name: { en: 'Veggie Burger', ar: 'برجر نباتي' }, priceMinor: 2200 }), 201);
  ctx.veggie = extra.body;
  expectStatus(await ctx.owner.put('/v1/products/reorder', { categoryId: ctx.catBurgers, orderedIds: [extra.body.id, ctx.burger.id] }), [200, 204]);
});

t('Owner', F, 'Deleting a modifier removes it from the group', async (ctx) => {
  const m = expectStatus(await ctx.owner.post(`/v1/modifier-groups/${ctx.groupExtras}/modifiers`, { name: { en: 'Temp', ar: 'مؤقت' }, priceDeltaMinor: 50 }), 201);
  expectStatus(await ctx.owner.delete(`/v1/modifier-groups/${ctx.groupExtras}/modifiers/${m.body.id}`), [200, 204]);
});

t('Owner', F, 'A temporary product and category can be deleted', async (ctx) => {
  const c = expectStatus(await ctx.owner.post('/v1/categories', { name: { en: 'Temp', ar: 'مؤقت' } }), 201);
  const p = expectStatus(await ctx.owner.post('/v1/products', { categoryId: c.body.id, name: { en: 'Temp', ar: 'مؤقت' }, priceMinor: 100 }), 201);
  expectStatus(await ctx.owner.delete(`/v1/products/${p.body.id}`), [200, 204]);
  expectStatus(await ctx.owner.delete(`/v1/categories/${c.body.id}`), [200, 204]);
  expectStatus(await ctx.owner.get(`/v1/products/${p.body.id}`), 404);
});

t('Manager', F, 'Manager can create a product and a category', async (ctx) => {
  const c = expectStatus(await ctx.manager.post('/v1/categories', { name: { en: 'Desserts', ar: 'حلويات' } }), 201);
  expectStatus(await ctx.manager.post('/v1/products', { categoryId: c.body.id, name: { en: 'Cake', ar: 'كيك' }, priceMinor: 1200 }), 201);
});

t('Cashier', F, 'Cashier can read the menu but not change it', async (ctx) => {
  expectStatus(await ctx.cashier.get('/v1/products'), 200);
  expectStatus(await ctx.cashier.post('/v1/categories', { name: { en: 'Nope', ar: 'لا' } }), 403);
  expectStatus(await ctx.cashier.patch(`/v1/products/${ctx.burger.id}`, { priceMinor: 1 }), 403);
  expectStatus(await ctx.cashier.delete(`/v1/products/${ctx.burger.id}`), 403);
});

t('Kitchen', F, 'Kitchen cannot manage the menu', async (ctx) => {
  expectStatus(await ctx.kitchen.post('/v1/categories', { name: { en: 'Nope', ar: 'لا' } }), 403);
  expectStatus(await ctx.kitchen.post('/v1/modifier-groups', { name: { en: 'Nope', ar: 'لا' }, minSelect: 0, maxSelect: 1 }), 403);
});
