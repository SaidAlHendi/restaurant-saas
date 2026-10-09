import path from 'node:path';

import { loadDotenvFromMonorepoRoot } from '../src/config/load-dotenv';

import { applyTestDatabaseEnv } from './test-db-env';

process.env['NODE_ENV'] = 'test';
loadDotenvFromMonorepoRoot();
applyTestDatabaseEnv();

// Tests always use local disk storage, whatever the developer's .env says (e.g. an R2 bucket).
process.env['STORAGE_DRIVER'] = 'local';
process.env['STORAGE_LOCAL_ROOT'] =
  process.env['STORAGE_LOCAL_ROOT'] || path.join(__dirname, '..', '.storage');

process.env['REDIS_URL'] = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
process.env['APP_ROLE'] = 'api';
process.env['JWT_ACCESS_SECRET'] =
  process.env['JWT_ACCESS_SECRET'] ?? 'test-jwt-access-secret-min-32-chars!!';
process.env['COOKIE_SECURE'] = process.env['COOKIE_SECURE'] ?? 'false';
process.env['SEED_PASSWORD'] =
  process.env['SEED_PASSWORD'] ?? 'seed-password-123456';
process.env['DATABASE_WORKER_URL'] =
  process.env['DATABASE_WORKER_URL'] ??
  'postgresql://app_worker:app_worker_dev@localhost:5432/restaurant_saas_test';
