import pg from 'pg';

import { loadEnv } from '../config/env';

/**
 * Idempotent fixes for test DBs (run after migrate + seed).
 */
export async function ensureTestDbShape(): Promise<void> {
  const pool = new pg.Pool({ connectionString: loadEnv().DATABASE_MIGRATION_URL });
  try {
    await pool.query(
      `DROP POLICY IF EXISTS organizations_select_signup_slug ON public.organizations`,
    );
    await pool.query(
      `DELETE FROM public.role_permissions WHERE role_id = '00000000-0000-4000-8000-000000000104'`,
    );

    const col = await pool.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'auth_sessions' AND column_name = 'org_id'
      ) AS exists
    `);
    const hasOrgIdColumn = col.rows[0]?.exists === true;

    if (!hasOrgIdColumn) {
      await pool.query(`ALTER TABLE public.auth_sessions ADD COLUMN org_id uuid`);
      await pool.query(`
        UPDATE public.auth_sessions s
        SET org_id = u.last_org_id
        FROM public.users u
        INNER JOIN public.organizations o ON o.id = u.last_org_id
        WHERE s.user_id = u.id AND s.org_id IS NULL
      `);
      await pool.query(`
        UPDATE public.auth_sessions s
        SET org_id = m.org_id
        FROM (
          SELECT DISTINCT ON (user_id) user_id, org_id
          FROM public.memberships
          WHERE status = 'active'
          ORDER BY user_id, created_at
        ) m
        INNER JOIN public.organizations o ON o.id = m.org_id
        WHERE s.user_id = m.user_id AND s.org_id IS NULL
      `);
      await pool.query(`
        DELETE FROM public.auth_sessions
        WHERE org_id IS NULL
           OR NOT EXISTS (
             SELECT 1 FROM public.organizations o WHERE o.id = auth_sessions.org_id
           )
      `);
      await pool.query(`ALTER TABLE public.auth_sessions ALTER COLUMN org_id SET NOT NULL`);
    }

    const fk = await pool.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'auth_sessions'
          AND constraint_name = 'auth_sessions_org_id_organizations_id_fk'
      ) AS exists
    `);
    if (!fk.rows[0]?.exists) {
      await pool.query(`
        DELETE FROM public.auth_sessions
        WHERE org_id IS NULL
           OR NOT EXISTS (
             SELECT 1 FROM public.organizations o WHERE o.id = auth_sessions.org_id
           )
      `);
      await pool.query(`
        ALTER TABLE public.auth_sessions
        ADD CONSTRAINT auth_sessions_org_id_organizations_id_fk
        FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE
      `);
    }
  } finally {
    await pool.end();
  }
}

async function main(): Promise<void> {
  await ensureTestDbShape();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
