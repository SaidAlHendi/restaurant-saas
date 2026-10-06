const DEFAULT_TEST_DATABASE_URL =
  'postgresql://app_user:app_user_dev@localhost:5432/restaurant_saas_test';

/** E2e always uses the test database — never dev DATABASE_URL / DATABASE_MIGRATION_URL from .env. */
export function applyTestDatabaseEnv(): void {
  const databaseUrl = process.env['DATABASE_URL_TEST'] ?? DEFAULT_TEST_DATABASE_URL;
  const migrationUrl =
    process.env['DATABASE_MIGRATION_URL_TEST'] ??
    databaseUrl.replace('app_user:app_user_dev', 'app_owner:app_owner_dev');

  process.env['DATABASE_URL'] = databaseUrl;
  process.env['DATABASE_MIGRATION_URL'] = migrationUrl;
}
