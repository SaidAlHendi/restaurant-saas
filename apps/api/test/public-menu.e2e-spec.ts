import { eq } from 'drizzle-orm';
import { type INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';

import { organizations } from '../src/core/db/schema/tenancy';
import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { withOrg } from '../src/core/db/with-org';
import { newUuidV7 } from '../src/lib/uuid';

import { asDemoOwner, asOtherOwner, categoryBody, productBody } from './catalog-helpers';
import { createTestApp } from './create-test-app';
import { SEED_ORG } from './factories';
import { apiAgent } from './http';

type PublicMenuBody = {
  org: { slug: string; locales: string[]; logoUrl: string | null; currency: string };
  categories: Array<{
    id: string;
    sortOrder: number;
    products: Array<{
      id: string;
      name: string;
      currency: string;
      modifierGroups: Array<{ modifiers: Array<{ name: string }> }>;
    }>;
  }>;
  effectiveLocale: string;
  poweredBy?: boolean;
};

type OrgStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled';

describe('Public menu API (e2e)', () => {
  let app: INestApplication;
  let agent: Agent;
  let db: DrizzleDb;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = apiAgent(app);
    db = app.get(DRIZZLE);
  });

  afterAll(async () => {
    await app.close();
  });

  async function getOrgStatus(orgId: string): Promise<OrgStatus> {
    let status: OrgStatus = 'trial';
    await withOrg(db, orgId, async (tx) => {
      const rows = await tx
        .select({ status: organizations.status })
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);
      const row = rows[0];
      if (row) {
        status = row.status;
      }
    });
    return status;
  }

  async function setOrgStatus(orgId: string, status: OrgStatus) {
    await withOrg(db, orgId, async (tx) => {
      await tx.update(organizations).set({ status }).where(eq(organizations.id, orgId));
    });
  }

  it('happy path: order, locale fallback, modifiers, Cache-Control', async () => {
    const suffix = newUuidV7().slice(-8);
    const owner = await asDemoOwner(apiAgent(app));
    const cat = await owner.post('/v1/categories').send(
      categoryBody(`PubCat ${suffix}`, `ق ${suffix}`),
    );
    expect(cat.status).toBe(201);
    const categoryId = (cat.body as { id: string }).id;

    const prod = await owner.post('/v1/products').send({
      ...productBody(categoryId, 2200),
      name: { en: `PubItem ${suffix}`, ar: `صنف ${suffix}` },
    });
    expect(prod.status).toBe(201);
    const productId = (prod.body as { id: string }).id;

    const group = await owner.post('/v1/modifier-groups').send({
      name: { en: `Extras ${suffix}`, ar: `إض ${suffix}` },
      minSelect: 0,
      maxSelect: 1,
    });
    const groupId = (group.body as { id: string }).id;
    await owner.post(`/v1/modifier-groups/${groupId}/modifiers`).send({
      name: { en: 'Cheese', ar: 'جبن' },
      priceDeltaMinor: 200,
    });
    await owner.put(`/v1/products/${productId}/modifier-groups`).send({ groupIds: [groupId] });

    const menuRes = await agent.get('/v1/public/menus/demo?locale=ar');
    expect(menuRes.status).toBe(200);
    expect(menuRes.headers['cache-control']).toBe(
      'public, s-maxage=60, stale-while-revalidate=600',
    );

    const menu = menuRes.body as PublicMenuBody;
    const category = menu.categories.find((c) => c.id === categoryId);
    expect(category).toBeDefined();
    const product = category?.products.find((p) => p.id === productId);
    expect(product?.name).toBe(`صنف ${suffix}`);

    const defaultLocale = await agent.get('/v1/public/menus/demo');
    expect((defaultLocale.body as PublicMenuBody).effectiveLocale).toBe('en');

    const withMods = category?.products.find((p) => p.id === productId);
    expect(withMods?.modifierGroups.some((g) => g.modifiers.length > 0)).toBe(true);
  });

  it('hides inactive and deleted catalog rows', async () => {
    const suffix = newUuidV7().slice(-8);
    const owner = await asDemoOwner(apiAgent(app));
    const cat = await owner.post('/v1/categories').send(categoryBody(`Hide ${suffix}`, `إ ${suffix}`));
    const categoryId = (cat.body as { id: string }).id;
    const prod = await owner.post('/v1/products').send(productBody(categoryId));
    const productId = (prod.body as { id: string }).id;

    await owner.patch(`/v1/products/${productId}`).send({ isActive: false });
    let menu = await agent.get('/v1/public/menus/demo');
    let ids = (menu.body as PublicMenuBody).categories.flatMap((c) => c.products.map((p) => p.id));
    expect(ids).not.toContain(productId);

    await owner.patch(`/v1/products/${productId}`).send({ isActive: true });
    await owner.delete(`/v1/products/${productId}`);
    menu = await agent.get('/v1/public/menus/demo');
    ids = (menu.body as PublicMenuBody).categories.flatMap((c) => c.products.map((p) => p.id));
    expect(ids).not.toContain(productId);
  });

  it('404 unknown slug and suspended; 410 cancelled', async () => {
    const previousStatus = await getOrgStatus(SEED_ORG.demo.id);
    try {
      const suffix = newUuidV7().slice(-8);
      const unknown = await agent.get(`/v1/public/menus/no-org-${suffix}`);
      expect(unknown.status).toBe(404);
      expect(unknown.headers['cache-control']).toBe('public, s-maxage=30');

      await setOrgStatus(SEED_ORG.demo.id, 'suspended');
      const suspended = await agent.get('/v1/public/menus/demo');
      expect(suspended.status).toBe(404);

      await setOrgStatus(SEED_ORG.demo.id, 'cancelled');
      const cancelled = await agent.get('/v1/public/menus/demo');
      expect(cancelled.status).toBe(410);
    } finally {
      await setOrgStatus(SEED_ORG.demo.id, previousStatus);
    }
  });

  it('branch menu uses org default currency for product prices', async () => {
    const suffix = newUuidV7().slice(-8);
    const owner = await asDemoOwner(apiAgent(app));
    const cat = await owner.post('/v1/categories').send(categoryBody(`Cur ${suffix}`, `ع ${suffix}`));
    const categoryId = (cat.body as { id: string }).id;
    await owner.post('/v1/products').send({
      ...productBody(categoryId, 1800),
      name: { en: `CurItem ${suffix}`, ar: `ع ${suffix}` },
    });

    const branchList = await owner.get('/v1/branches');
    const firstBranch = (branchList.body as { items: Array<{ id: string; slug: string }> }).items[0];
    expect(firstBranch).toBeDefined();

    const branchId = firstBranch?.id ?? '';
    const branchSlug = firstBranch?.slug ?? '';

    await owner.patch(`/v1/branches/${branchId}`).send({ currency: 'KWD' });
    try {
      const menu = await agent.get(`/v1/public/menus/demo/branches/${branchSlug}`);
      expect(menu.status).toBe(200);
      const menuBody = menu.body as PublicMenuBody;
      const product = menuBody.categories
        .flatMap((c) => c.products)
        .find((p) => p.name.includes(suffix));
      expect(product).toBeDefined();
      expect(product?.currency).toBe('SAR');
      expect(menuBody.org.currency).toBe('SAR');
    } finally {
      await owner.patch(`/v1/branches/${branchId}`).send({ currency: 'SAR' });
    }
  });

  it('branch menu 404 for unknown branch', async () => {
    const suffix = newUuidV7().slice(-8);
    const res = await agent.get(`/v1/public/menus/demo/branches/no-branch-${suffix}`);
    expect(res.status).toBe(404);
  });

  it('table token happy path, inactive 404, rotated 404, table Cache-Control', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const me = await owner.get('/v1/me');
    const branchId = (me.body as { branches: Array<{ id: string; slug: string }> }).branches[0]?.id;
    const branchSlug = (me.body as { branches: Array<{ slug: string }> }).branches[0]?.slug;
    expect(branchId).toBeDefined();

    const label = `QR-${newUuidV7().slice(-8)}`;
    const created = await owner.post(`/v1/branches/${branchId ?? ''}/tables`).send({ label });
    const tableId = (created.body as { id: string; qrToken: string }).id;
    const qrToken = (created.body as { qrToken: string }).qrToken;

    const ok = await agent.get(`/v1/public/tables/${qrToken}`);
    expect(ok.status).toBe(200);
    expect(ok.headers['cache-control']).toBe('public, s-maxage=30');
    expect(ok.body).toMatchObject({
      orgSlug: 'demo',
      branchSlug,
      tableLabel: label,
    });

    await owner.patch(`/v1/branches/${branchId ?? ''}/tables/${tableId}`).send({ isActive: false });
    const inactive = await agent.get(`/v1/public/tables/${qrToken}`);
    expect(inactive.status).toBe(404);

    await owner.patch(`/v1/branches/${branchId ?? ''}/tables/${tableId}`).send({ isActive: true });
    const rotated = await owner.post(
      `/v1/branches/${branchId ?? ''}/tables/${tableId}/rotate-qr`,
    );
    expect(rotated.status).toBe(201);
    const oldLookup = await agent.get(`/v1/public/tables/${qrToken}`);
    expect(oldLookup.status).toBe(404);
  });

  it('does not leak other org ids or storage keys', async () => {
    const suffix = newUuidV7().slice(-8);
    const other = await asOtherOwner(apiAgent(app));
    const cat = await other.post('/v1/categories').send(categoryBody(`Other ${suffix}`, `أ ${suffix}`));
    const categoryId = (cat.body as { id: string }).id;
    await other.post('/v1/products').send({
      ...productBody(categoryId, 999),
      name: { en: `Secret ${suffix}`, ar: `سر ${suffix}` },
    });

    const menu = await agent.get('/v1/public/menus/demo');
    expect(menu.status).toBe(200);
    const raw = JSON.stringify(menu.body);
    expect(raw).not.toContain(SEED_ORG.other.id);
    expect(raw).not.toContain('image_key');
    expect(raw).not.toContain('imageKey');
    expect(raw).not.toContain(`Secret ${suffix}`);
  });
});
