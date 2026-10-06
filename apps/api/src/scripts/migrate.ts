import path from 'node:path';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

import { loadEnv } from '../config/env';

export async function runMigrations(): Promise<void> {
  const env = loadEnv();
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
  const db = drizzle(pool);
  const migrationsFolder = path.join(process.cwd(), 'drizzle');
  await migrate(db, { migrationsFolder });
  await pool.end();
}

async function main(): Promise<void> {
  await runMigrations();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
