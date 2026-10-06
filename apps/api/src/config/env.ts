import { z } from 'zod';

import { loadDotenvFromMonorepoRoot } from './load-dotenv';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_ROLE: z.enum(['api', 'worker', 'all']).default('all'),
  DATABASE_URL: z.url(),
  DATABASE_MIGRATION_URL: z.url(),
  REDIS_URL: z.url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  COOKIE_SECURE: z
    .enum(['true', 'false', '1', '0'])
    .default('true')
    .transform((v) => v === 'true' || v === '1'),
  SEED_PASSWORD: z.string().min(8).optional(),
  CORS_ORIGINS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

const DEFAULT_TEST_DATABASE_URL =
  'postgresql://app_user:app_user_dev@localhost:5432/restaurant_saas_test';

/** E2e must never use dev DATABASE_URL from `.env` when NODE_ENV is test. */
function withTestDatabaseUrls(raw: Record<string, string | undefined>): Record<string, string | undefined> {
  if (raw['NODE_ENV'] !== 'test') {
    return raw;
  }
  const databaseUrl = raw['DATABASE_URL_TEST'] ?? DEFAULT_TEST_DATABASE_URL;
  const migrationUrl =
    raw['DATABASE_MIGRATION_URL_TEST'] ??
    databaseUrl.replace('app_user:app_user_dev', 'app_owner:app_owner_dev');
  return {
    ...raw,
    DATABASE_URL: databaseUrl,
    DATABASE_MIGRATION_URL: migrationUrl,
  };
}

let cached: Env | undefined;

export function loadEnv(overrides?: Record<string, string | undefined>): Env {
  if (cached && !overrides) {
    return cached;
  }
  loadDotenvFromMonorepoRoot();
  const parsed = envSchema.safeParse(withTestDatabaseUrls({ ...process.env, ...overrides }));
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(
      `Invalid environment: ${message}. Copy .env.example to .env at the repo root and set required variables.`,
    );
  }
  cached = parsed.data;
  return parsed.data;
}

export function resetEnvCacheForTests(): void {
  cached = undefined;
}

export function requireSeedPassword(): string {
  const env = loadEnv();
  if (!env.SEED_PASSWORD) {
    throw new Error('SEED_PASSWORD is required to run db:seed');
  }
  return env.SEED_PASSWORD;
}
