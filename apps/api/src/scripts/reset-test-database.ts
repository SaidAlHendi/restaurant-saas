import pg from 'pg';

import { loadEnv } from '../config/env';

import { assertTestDatabaseUrl } from './reset-test-database.utils';

const RESET_SQL = `
DROP SCHEMA IF EXISTS drizzle CASCADE;
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
ALTER SCHEMA public OWNER TO app_owner;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT USAGE ON SCHEMA public TO app_worker;
`;

export async function resetTestDatabaseSchema(): Promise<void> {
  const env = loadEnv();
  assertTestDatabaseUrl(env.DATABASE_MIGRATION_URL);
  const pool = new pg.Pool({ connectionString: env.DATABASE_MIGRATION_URL });
  try {
    await pool.query(RESET_SQL);
  } finally {
    await pool.end();
  }
}

async function main(): Promise<void> {
  await resetTestDatabaseSchema();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
