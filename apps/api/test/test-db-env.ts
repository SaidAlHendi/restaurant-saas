const DEFAULT_TEST_DATABASE_URL =
  'postgresql://app_user:app_user_dev@localhost:5432/restaurant_saas_test';

const DEFAULT_TEST_MIGRATION_URL =
  'postgresql://app_owner:app_owner_dev@localhost:5432/restaurant_saas_test';

/** Values present when Jest starts (CI job env). Not trusted locally — Turbo forwards `.env` too. */
let shellDatabaseUrlTest: string | undefined;
let shellMigrationUrlTest: string | undefined;
let shellCaptureDone = false;

export function captureShellTestDatabaseEnv(): void {
  if (shellCaptureDone) {
    return;
  }
  shellCaptureDone = true;
  shellDatabaseUrlTest = process.env['DATABASE_URL_TEST'];
  shellMigrationUrlTest = process.env['DATABASE_MIGRATION_URL_TEST'];
}

function isCi(): boolean {
  return process.env['CI'] === 'true' || process.env['GITHUB_ACTIONS'] === 'true';
}

function resolveE2eDatabaseUrl(): string {
  const explicit = process.env['E2E_DATABASE_URL'];
  if (explicit) {
    return explicit;
  }
  if (isCi()) {
    return (
      shellDatabaseUrlTest ??
      process.env['DATABASE_URL'] ??
      DEFAULT_TEST_DATABASE_URL
    );
  }
  return DEFAULT_TEST_DATABASE_URL;
}

function resolveE2eMigrationUrl(databaseUrl: string): string {
  const explicit = process.env['E2E_DATABASE_MIGRATION_URL'];
  if (explicit) {
    return explicit;
  }
  if (isCi()) {
    return (
      shellMigrationUrlTest ??
      process.env['DATABASE_MIGRATION_URL'] ??
      databaseUrl.replace('app_user:app_user_dev', 'app_owner:app_owner_dev')
    );
  }
  return DEFAULT_TEST_MIGRATION_URL;
}

/** E2e uses the test database — never dev DATABASE_URL / DATABASE_MIGRATION_URL from `.env`. */
export function applyTestDatabaseEnv(): void {
  captureShellTestDatabaseEnv();

  const databaseUrl = resolveE2eDatabaseUrl();
  const migrationUrl = resolveE2eMigrationUrl(databaseUrl);

  process.env['DATABASE_URL'] = databaseUrl;
  process.env['DATABASE_MIGRATION_URL'] = migrationUrl;

  delete process.env['DATABASE_URL_TEST'];
  delete process.env['DATABASE_MIGRATION_URL_TEST'];
}

export function testDatabaseEnvHint(): string {
  return (
    'E2e Postgres default: ' +
    DEFAULT_TEST_DATABASE_URL +
    ' (shared local Postgres on 5432). ' +
    'Bundled compose on 5433: export E2E_DATABASE_URL=postgresql://app_user:app_user_dev@localhost:5433/restaurant_saas_test'
  );
}
