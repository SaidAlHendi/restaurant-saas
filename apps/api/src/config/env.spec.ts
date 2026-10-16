import { loadEnv, resetEnvCacheForTests } from './env';

describe('loadEnv', () => {
  const base = {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://app_user:app_user_dev@localhost:5432/restaurant_saas_test',
    DATABASE_MIGRATION_URL:
      'postgresql://app_owner:app_owner_dev@localhost:5432/restaurant_saas_test',
    REDIS_URL: 'redis://localhost:6379',
    JWT_ACCESS_SECRET: 'test-jwt-access-secret-min-32-chars!!',
  } as const;

  afterEach(() => {
    resetEnvCacheForTests();
  });

  it('does not require DATABASE_WORKER_URL when APP_ROLE is api', () => {
    resetEnvCacheForTests();
    const env = loadEnv({
      ...base,
      APP_ROLE: 'api',
      DATABASE_WORKER_URL: undefined,
    });
    expect(env.APP_ROLE).toBe('api');
    expect(env.DATABASE_WORKER_URL).toBeUndefined();
  });

  it('requires DATABASE_WORKER_URL when APP_ROLE is worker', () => {
    resetEnvCacheForTests();
    expect(() =>
      loadEnv({
        ...base,
        APP_ROLE: 'worker',
        DATABASE_WORKER_URL: undefined,
      }),
    ).toThrow(/DATABASE_WORKER_URL/);
  });

  it('requires CORS_ORIGINS for the API in production', () => {
    resetEnvCacheForTests();
    expect(() =>
      loadEnv({ ...base, NODE_ENV: 'production', APP_ROLE: 'api', CORS_ORIGINS: undefined }),
    ).toThrow(/CORS_ORIGINS/);
    resetEnvCacheForTests();
    const env = loadEnv({
      ...base,
      NODE_ENV: 'production',
      APP_ROLE: 'api',
      CORS_ORIGINS: 'https://app.example.com',
    });
    expect(env.CORS_ORIGINS).toBe('https://app.example.com');
  });
});
