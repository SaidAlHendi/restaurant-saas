import { z } from 'zod';

import { loadDotenvFromMonorepoRoot } from './load-dotenv';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_ROLE: z.enum(['api', 'worker', 'all']).default('all'),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function loadEnv(overrides?: Record<string, string | undefined>): Env {
  if (cached && !overrides) {
    return cached;
  }
  loadDotenvFromMonorepoRoot();
  const parsed = envSchema.safeParse({ ...process.env, ...overrides });
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(
      `Invalid environment: ${message}. Copy .env.example to .env at the repo root and set DATABASE_URL / REDIS_URL.`,
    );
  }
  cached = parsed.data;
  return parsed.data;
}

export function resetEnvCacheForTests(): void {
  cached = undefined;
  // env.setup.ts sets DATABASE_URL before AppModule; do not re-read .env in tests.
}
