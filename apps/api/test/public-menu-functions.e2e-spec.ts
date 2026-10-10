import { sql } from 'drizzle-orm';
import { type INestApplication } from '@nestjs/common';

import { DRIZZLE, type DrizzleDb } from '../src/core/db/db.module';
import { withOrg } from '../src/core/db/with-org';
import { generateQrToken } from '../src/lib/qr-token';
import { newUuidV7 } from '../src/lib/uuid';

import { createTestApp } from './create-test-app';
import { SEED_ORG } from './factories';
import { asDemoOwner } from './catalog-helpers';
import { apiAgent } from './http';

describe('Public menu SQL functions (e2e)', () => {
  let app: INestApplication;
  let db: DrizzleDb;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    db = app.get(DRIZZLE);
  });

  afterAll(async () => {
    await app.close();
  });

  it('app_user can EXECUTE resolve helpers', async () => {
    const org = await db.execute(
      sql`SELECT org_id, status FROM public.public_resolve_org('demo')`,
    );
    expect(org.rows.length).toBe(1);

    const sitemap = await db.execute(sql`SELECT slug FROM public.public_list_menu_sitemap()`);
    expect((sitemap.rows as { slug: string }[]).some((r) => r.slug === 'demo')).toBe(true);
  });

  it('resolve helpers return nothing for unknown slug or inactive table', async () => {
    const suffix = newUuidV7().slice(-8);
    const missing = await db.execute(
      sql`SELECT org_id FROM public.public_resolve_org(${`no-such-org-${suffix}`})`,
    );
    expect(missing.rows.length).toBe(0);

    const token = generateQrToken();
    const missingTable = await db.execute(
      sql`SELECT org_id FROM public.public_resolve_table(${token})`,
    );
    expect(missingTable.rows.length).toBe(0);
  });

  it('inactive table yields no resolve row', async () => {
    const owner = await asDemoOwner(apiAgent(app));
    const me = await owner.get('/v1/me');
    const branchId = (me.body as { branches: Array<{ id: string }> }).branches[0]?.id;
    expect(branchId).toBeDefined();

    const label = `T-${newUuidV7().slice(-8)}`;
    const created = await owner.post(`/v1/branches/${branchId ?? ''}/tables`).send({ label });
    expect(created.status).toBe(201);
    const tableId = (created.body as { id: string; qrToken: string }).id;
    const qrToken = (created.body as { qrToken: string }).qrToken;

    await owner.patch(`/v1/branches/${branchId ?? ''}/tables/${tableId}`).send({ isActive: false });

    const resolved = await db.execute(
      sql`SELECT org_id FROM public.public_resolve_table(${qrToken})`,
    );
    expect(resolved.rows.length).toBe(0);
  });

  it('app_user still cannot SELECT another org catalog rows directly', async () => {
    const demoProduct = await db.execute(
      sql`SELECT id FROM public.products LIMIT 1`,
    );
    expect(demoProduct.rows.length).toBe(0);

    await withOrg(db, SEED_ORG.other.id, async (tx) => {
      const count = await tx.execute(sql`SELECT count(*)::int AS c FROM public.products`);
      const c = (count.rows[0] as { c: number }).c;
      expect(c).toBeGreaterThanOrEqual(0);
    });

    const withoutContext = await db.execute(sql`SELECT count(*)::int AS c FROM public.products`);
    expect((withoutContext.rows[0] as { c: number }).c).toBe(0);
  });
});
