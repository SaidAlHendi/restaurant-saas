import fs from 'node:fs/promises';
import path from 'node:path';

import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import type { Env } from '../../config/env';
import {
  PROTECTED_ORG_IDS,
  SEED_ORG_SLUG_PREFIX,
  SEED_USER_EMAIL_SUFFIX,
} from './constants';

async function deleteLocalOrgStoragePrefix(env: Env, orgId: string): Promise<void> {
  if (env.STORAGE_DRIVER !== 'local') {
    return;
  }
  const root = env.STORAGE_LOCAL_ROOT ?? path.join(process.cwd(), '.storage');
  const orgDir = path.join(root, 'orgs', orgId);
  await fs.rm(orgDir, { recursive: true, force: true });
}

export async function resetSeedOrgs(env: Env): Promise<string[]> {
  const pool = new pg.Pool({ connectionString: env.DATABASE_MIGRATION_URL });
  const db = drizzle(pool);
  const removedOrgIds: string[] = [];

  try {
    await db.transaction(async (tx) => {
      const orgRows = await tx.execute<{ id: string; slug: string }>(sql`
        SELECT id, slug FROM organizations
        WHERE slug LIKE ${`${SEED_ORG_SLUG_PREFIX}%`}
      `);

      for (const row of orgRows.rows) {
        if (PROTECTED_ORG_IDS.has(row.id)) {
          throw new Error(`Refusing to reset protected org id ${row.id}`);
        }
        removedOrgIds.push(row.id);
      }

      if (removedOrgIds.length === 0) {
        return;
      }

      for (const orgId of removedOrgIds) {
        await tx.execute(sql`SELECT set_config('app.org_id', ${orgId}, true)`);

        await tx.execute(sql`DELETE FROM payments WHERE org_id = ${orgId}::uuid`);
        await tx.execute(sql`DELETE FROM order_item_modifiers WHERE org_id = ${orgId}::uuid`);
        await tx.execute(sql`DELETE FROM order_items WHERE org_id = ${orgId}::uuid`);
        await tx.execute(sql`DELETE FROM order_events WHERE org_id = ${orgId}::uuid`);
        await tx.execute(sql`DELETE FROM orders WHERE org_id = ${orgId}::uuid`);
        await tx.execute(sql`DELETE FROM branch_counters WHERE org_id = ${orgId}::uuid`);
        await tx.execute(
          sql`DELETE FROM product_modifier_groups WHERE org_id = ${orgId}::uuid`,
        );
        await tx.execute(sql`DELETE FROM modifiers WHERE org_id = ${orgId}::uuid`);
        await tx.execute(sql`DELETE FROM modifier_groups WHERE org_id = ${orgId}::uuid`);
        await tx.execute(sql`DELETE FROM products WHERE org_id = ${orgId}::uuid`);
        await tx.execute(sql`DELETE FROM categories WHERE org_id = ${orgId}::uuid`);
        await tx.execute(sql`DELETE FROM public."tables" WHERE org_id = ${orgId}::uuid`);
        await tx.execute(sql`DELETE FROM membership_branches WHERE org_id = ${orgId}::uuid`);
        await tx.execute(sql`DELETE FROM memberships WHERE org_id = ${orgId}::uuid`);
        await tx.execute(sql`DELETE FROM branches WHERE org_id = ${orgId}::uuid`);
        await tx.execute(sql`DELETE FROM organizations WHERE id = ${orgId}::uuid`);
      }

      await tx.execute(sql`
        DELETE FROM users u
        WHERE u.email LIKE ${`%${SEED_USER_EMAIL_SUFFIX}`}
          AND NOT EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = u.id)
      `);
    });
  } finally {
    await pool.end();
  }

  for (const orgId of removedOrgIds) {
    await deleteLocalOrgStoragePrefix(env, orgId);
  }

  return removedOrgIds;
}
