import { z } from 'zod';

import { loadDotenvFromMonorepoRoot } from './load-dotenv';

function emptyStringToUndefined(value: unknown): unknown {
  if (value === '' || value === undefined) {
    return undefined;
  }
  return value;
}

const optionalUrl = z.preprocess(emptyStringToUndefined, z.url().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_ROLE: z.enum(['api', 'worker', 'all']).default('all'),
  DATABASE_URL: z.url(),
  DATABASE_MIGRATION_URL: z.url(),
  DATABASE_WORKER_URL: optionalUrl,
  DATABASE_ADMIN_URL: optionalUrl,
  OUTBOX_PUBLISHER_INTERVAL_MS: z.coerce.number().int().positive().default(500),
  OUTBOX_SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  REDIS_URL: z.url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_ADMIN_SECRET: z.preprocess(emptyStringToUndefined, z.string().min(32).optional()),
  JWT_ADMIN_TTL: z.string().default('10m'),
  COOKIE_SECURE: z
    .enum(['true', 'false', '1', '0'])
    .default('true')
    .transform((v) => v === 'true' || v === '1'),
  SEED_PASSWORD: z.string().min(8).optional(),
  CORS_ORIGINS: z.string().optional(),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_ROOT: z.string().optional(),
  STORAGE_PUBLIC_BASE_URL: optionalUrl,
  S3_ENDPOINT: optionalUrl,
  S3_REGION: z.preprocess(emptyStringToUndefined, z.string().optional()),
  S3_BUCKET: z.preprocess(emptyStringToUndefined, z.string().optional()),
  S3_ACCESS_KEY_ID: z.preprocess(emptyStringToUndefined, z.string().optional()),
  S3_SECRET_ACCESS_KEY: z.preprocess(emptyStringToUndefined, z.string().optional()),
  S3_PUBLIC_BASE_URL: optionalUrl,
  UNSPLASH_ACCESS_KEY: z.preprocess(emptyStringToUndefined, z.string().optional()),
  PIXABAY_API_KEY: z.preprocess(emptyStringToUndefined, z.string().optional()),
  /** Chat webhook (Slack, Discord, Mattermost or any relay) told about each new marketing lead. */
  LEADS_NOTIFY_WEBHOOK_URL: optionalUrl,
  /**
   * Email for each new marketing lead, sent through Resend. Needs the key and at least one recipient
   * (comma separated); the sender must be an address on a domain verified in Resend.
   */
  RESEND_API_KEY: z.preprocess(emptyStringToUndefined, z.string().optional()),
  LEADS_NOTIFY_EMAIL_TO: z.preprocess(emptyStringToUndefined, z.string().optional()),
  LEADS_NOTIFY_EMAIL_FROM: z.preprocess(
    emptyStringToUndefined,
    z.string().default('Sahtain <onboarding@resend.dev>'),
  ),
  WEB_APP_URL: z.preprocess(emptyStringToUndefined, z.url().default('http://localhost:5173')),
  PADDLE_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  PADDLE_API_KEY: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  PADDLE_WEBHOOK_SECRET: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  PADDLE_PRICE_MENU: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  PADDLE_PRICE_RESTAURANT: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  PADDLE_PRICE_BUSINESS: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
}).superRefine((data, ctx) => {
  // Without an allow-list the API reflects any origin with credentials, which would let any
  // site read a refreshed access token. Only acceptable for local development and tests.
  if (
    data.NODE_ENV === 'production' &&
    data.APP_ROLE !== 'worker' &&
    (data.CORS_ORIGINS ?? '').trim().length === 0
  ) {
    ctx.addIssue({
      code: 'custom',
      message: 'CORS_ORIGINS is required when NODE_ENV=production',
      path: ['CORS_ORIGINS'],
    });
  }
  if (
    (data.APP_ROLE === 'worker' || data.APP_ROLE === 'all') &&
    !data.DATABASE_WORKER_URL
  ) {
    ctx.addIssue({
      code: 'custom',
      message: 'DATABASE_WORKER_URL is required when APP_ROLE is worker or all',
      path: ['DATABASE_WORKER_URL'],
    });
  }
  if (data.APP_ROLE === 'api' || data.APP_ROLE === 'all') {
    if (!data.DATABASE_ADMIN_URL) {
      ctx.addIssue({
        code: 'custom',
        message: 'DATABASE_ADMIN_URL is required when APP_ROLE is api or all',
        path: ['DATABASE_ADMIN_URL'],
      });
    }
    if (!data.JWT_ADMIN_SECRET) {
      ctx.addIssue({
        code: 'custom',
        message: 'JWT_ADMIN_SECRET is required (min 32 chars) when APP_ROLE is api or all',
        path: ['JWT_ADMIN_SECRET'],
      });
    }
  }
  // A shared secret would let a tenant access token verify as an admin token (and the reverse).
  if (data.JWT_ADMIN_SECRET && data.JWT_ADMIN_SECRET === data.JWT_ACCESS_SECRET) {
    ctx.addIssue({
      code: 'custom',
      message: 'JWT_ADMIN_SECRET must differ from JWT_ACCESS_SECRET',
      path: ['JWT_ADMIN_SECRET'],
    });
  }
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
