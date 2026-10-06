const DEFAULT_TEST_DATABASE_URL =
  'postgresql://app_user:app_user_dev@localhost:5432/restaurant_saas_test';

const DEFAULT_TEST_MIGRATION_URL =
  'postgresql://app_owner:app_owner_dev@localhost:5432/restaurant_saas_test';

/** E2e uses the test database — never dev DATABASE_URL / DATABASE_MIGRATION_URL from `.env`. */
export function applyTestDatabaseEnv(): void {
  const databaseUrl = process.env['E2E_DATABASE_URL'] ?? DEFAULT_TEST_DATABASE_URL;
  const migrationUrl =
    process.env['E2E_DATABASE_MIGRATION_URL'] ??
    (process.env['E2E_DATABASE_URL']
      ? databaseUrl.replace('app_user:app_user_dev', 'app_owner:app_owner_dev')
      : DEFAULT_TEST_MIGRATION_URL);

  process.env['DATABASE_URL'] = databaseUrl;
  process.env['DATABASE_MIGRATION_URL'] = migrationUrl;
}

export function redactDatabaseUrl(url: string): string {
  return url.replace(/\/\/([^:/]+):([^@/]+)@/, '//$1:***@');
}

export function testDatabaseEnvHint(): string {
  return (
    'E2e Postgres default: ' +
    DEFAULT_TEST_DATABASE_URL +
    ' (shared local Postgres on 5432). ' +
    'Override with E2E_DATABASE_URL / E2E_DATABASE_MIGRATION_URL (CI uses port 5433).'
  );
}
