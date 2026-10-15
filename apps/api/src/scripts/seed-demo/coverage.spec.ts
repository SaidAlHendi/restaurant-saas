import { getTableName, is } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';

import * as schema from '../../core/db/schema/index';

import { SEED_COVERAGE } from './coverage';

function listSchemaTables(): string[] {
  const names: string[] = [];
  for (const value of Object.values(schema)) {
    if (is(value, PgTable)) {
      names.push(getTableName(value));
    }
  }
  return names.sort();
}

describe('SEED_COVERAGE', () => {
  it('lists every Drizzle table and no extras', () => {
    const tables = listSchemaTables();
    const coverageKeys = Object.keys(SEED_COVERAGE).sort();

    const missing = tables.filter((t) => SEED_COVERAGE[t] === undefined);
    const extra = coverageKeys.filter((k) => !tables.includes(k));

    if (missing.length > 0) {
      throw new Error(`SEED_COVERAGE missing table(s): ${missing.join(', ')}`);
    }
    if (extra.length > 0) {
      throw new Error(`SEED_COVERAGE unknown table(s): ${extra.join(', ')}`);
    }

    expect(coverageKeys).toEqual(tables);
  });
});
