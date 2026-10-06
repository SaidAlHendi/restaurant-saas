import { execSync } from 'node:child_process';
import path from 'node:path';

import pg from 'pg';

import { loadDotenvFromMonorepoRoot } from '../src/config/load-dotenv';
import { SYSTEM_KITCHEN_ROLE_ID } from '../src/modules/identity/constants';

import { applyTestDatabaseEnv } from './test-db-env';

const TEST_SEED_PASSWORD = 'seed-password-123456';

export default async function globalSetup(): Promise<void> {
  loadDotenvFromMonorepoRoot();
  process.env['NODE_ENV'] = 'test';
  applyTestDatabaseEnv();

  process.env['REDIS_URL'] = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
  process.env['APP_ROLE'] = 'api';
  process.env['JWT_ACCESS_SECRET'] =
    process.env['JWT_ACCESS_SECRET'] ?? 'test-jwt-access-secret-min-32-chars!!';
  process.env['COOKIE_SECURE'] = process.env['COOKIE_SECURE'] ?? 'false';
  process.env['SEED_PASSWORD'] = process.env['SEED_PASSWORD'] ?? TEST_SEED_PASSWORD;

  const cwd = path.join(__dirname, '..');
  const env = { ...process.env };

  execSync('pnpm exec tsx src/scripts/migrate.ts', { cwd, env, stdio: 'inherit' });

  const databaseUrl = env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for e2e global setup');
  }
  const ownerUrl = databaseUrl.replace('app_user:app_user_dev', 'app_owner:app_owner_dev');
  const migrationPool = new pg.Pool({ connectionString: ownerUrl });
  await migrationPool.query(`DELETE FROM public.role_permissions WHERE role_id = $1`, [
    SYSTEM_KITCHEN_ROLE_ID,
  ]);
  await migrationPool.end();

  execSync('pnpm exec tsx src/scripts/seed.ts', { cwd, env, stdio: 'inherit' });
}
