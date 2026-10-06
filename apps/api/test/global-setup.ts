import { execSync } from 'node:child_process';
import path from 'node:path';

import { loadDotenvFromMonorepoRoot } from '../src/config/load-dotenv';

import { applyTestDatabaseEnv, captureShellTestDatabaseEnv, testDatabaseEnvHint } from './test-db-env';

const TEST_SEED_PASSWORD = 'seed-password-123456';

export default function globalSetup(): void {
  process.env['NODE_ENV'] = 'test';
  captureShellTestDatabaseEnv();
  loadDotenvFromMonorepoRoot();
  applyTestDatabaseEnv();

  process.env['REDIS_URL'] = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
  process.env['APP_ROLE'] = 'api';
  process.env['JWT_ACCESS_SECRET'] =
    process.env['JWT_ACCESS_SECRET'] ?? 'test-jwt-access-secret-min-32-chars!!';
  process.env['COOKIE_SECURE'] = process.env['COOKIE_SECURE'] ?? 'false';
  process.env['SEED_PASSWORD'] = process.env['SEED_PASSWORD'] ?? TEST_SEED_PASSWORD;

  const cwd = path.join(__dirname, '..');
  const env = { ...process.env };

  try {
    execSync('pnpm exec tsx src/scripts/migrate.ts', { cwd, env, stdio: 'inherit' });
    execSync('pnpm exec tsx src/scripts/seed.ts', { cwd, env, stdio: 'inherit' });
  } catch (err: unknown) {
    console.error('\n[e2e global-setup] migrate/seed failed.');
    console.error(testDatabaseEnvHint());
    console.error(`DATABASE_MIGRATION_URL=${env['DATABASE_MIGRATION_URL'] ?? '(unset)'}\n`);
    throw err;
  }
}
