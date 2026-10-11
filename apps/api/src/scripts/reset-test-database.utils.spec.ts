import { assertTestDatabaseUrl } from './reset-test-database.utils';

describe('assertTestDatabaseUrl', () => {
  it('refuses non-test database names', () => {
    expect(() => {
      assertTestDatabaseUrl(
        'postgresql://app_owner:app_owner_dev@localhost:5432/restaurant_saas',
      );
    }).toThrow(/must end with "_test"/);
  });

  it('allows test database names', () => {
    expect(() => {
      assertTestDatabaseUrl(
        'postgresql://app_owner:app_owner_dev@localhost:5432/restaurant_saas_test',
      );
    }).not.toThrow();
  });
});
