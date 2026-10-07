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
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_ROOT: z.string().optional(),
  STORAGE_PUBLIC_BASE_URL: z.url().optional(),
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.url().optional(),
}).superRefine((data, ctx) => {
  if (data.STORAGE_DRIVER === 's3') {
    const required = [
      ['S3_ENDPOINT', data.S3_ENDPOINT],
      ['S3_REGION', data.S3_REGION],
      ['S3_BUCKET', data.S3_BUCKET],
      ['S3_ACCESS_KEY_ID', data.S3_ACCESS_KEY_ID],
      ['S3_SECRET_ACCESS_KEY', data.S3_SECRET_ACCESS_KEY],
      ['S3_PUBLIC_BASE_URL', data.S3_PUBLIC_BASE_URL],
    ] as const;
    for (const [key, val] of required) {
      if (!val || val.length === 0) {
        ctx.addIssue({ code: 'custom', message: `${key} is required when STORAGE_DRIVER=s3`, path: [key] });
      }
    }
  }
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
