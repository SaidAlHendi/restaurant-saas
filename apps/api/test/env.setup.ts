process.env['DATABASE_URL'] =
  process.env['DATABASE_URL_TEST'] ??
  'postgresql://postgres:postgres@localhost:5433/restaurant_saas_test';
process.env['REDIS_URL'] = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
process.env['NODE_ENV'] = 'test';
process.env['APP_ROLE'] = 'api';
