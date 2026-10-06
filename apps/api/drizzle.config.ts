import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/core/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env['DATABASE_MIGRATION_URL'] ??
      'postgresql://app_owner:app_owner_dev@localhost:5432/restaurant_saas',
  },
});
