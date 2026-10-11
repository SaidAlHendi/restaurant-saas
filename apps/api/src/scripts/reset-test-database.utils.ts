export function assertTestDatabaseUrl(connectionString: string): void {
  let dbName: string;
  try {
    dbName = new URL(connectionString.replace(/^postgresql:\/\//, 'postgres://')).pathname.slice(1);
  } catch {
    throw new Error('DATABASE_MIGRATION_URL is not a valid Postgres URL');
  }
  if (!dbName.endsWith('_test')) {
    throw new Error(
      `Refusing to reset database "${dbName}": name must end with "_test" (got DATABASE_MIGRATION_URL).`,
    );
  }
}
