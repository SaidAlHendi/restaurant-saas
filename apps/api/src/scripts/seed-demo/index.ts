import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import { loadEnv, requireSeedPassword } from '../../config/env';
import * as schema from '../../core/db/schema/index';

import { ALL_ORG_DEFINITIONS } from './data/index';
import { parseDemoSeedArgv, printDemoSeedHelp } from './cli';
import { resetSeedOrgs } from './seed-reset';
import { hashSeedPassword, seedOrganizationTree } from './seed-orgs';
import { seedCatalogForOrg } from './seed-catalog';
import { seedOrderHistory } from './seed-orders';
import { seedProductImages } from './seed-images';
import { runSeedInvariants } from './run-invariants';
import { countSeedOrgTables, printSummaryTable } from './summary';

async function main(): Promise<void> {
  let options;
  try {
    options = parseDemoSeedArgv(process.argv.slice(2));
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'HELP') {
      printDemoSeedHelp();
      return;
    }
    throw err;
  }

  const env = loadEnv();
  if (env.NODE_ENV === 'production') {
    throw new Error('db:seed:demo refuses to run when NODE_ENV=production');
  }

  const passwordHash = await hashSeedPassword(requireSeedPassword());

  if (options.reset) {
    const removed = await resetSeedOrgs(env);
    process.stdout.write(`[seed-demo] Reset ${String(removed.length)} seed org(s)\n`);
  }

  const definitions = options.orgSlug
    ? ALL_ORG_DEFINITIONS.filter((o) => o.slug === options.orgSlug)
    : ALL_ORG_DEFINITIONS;

  if (definitions.length === 0) {
    throw new Error(`No seed org definition for slug "${options.orgSlug ?? ''}"`);
  }

  const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const seededOrgs = [];
  try {
    for (const definition of definitions) {
      const seeded = await seedOrganizationTree(db, definition, passwordHash);
      seededOrgs.push(seeded);
      await seedCatalogForOrg(db, seeded);
    }

    await seedOrderHistory(db, seededOrgs, { days: options.days, anchor: options.anchor });

    if (options.images === 'on') {
      await seedProductImages(
        db,
        env,
        seededOrgs.map((s) => ({ definition: s.definition, id: s.id })),
      );
    }

    await runSeedInvariants(db, seededOrgs);
    const counts = await countSeedOrgTables(
      db,
      seededOrgs.map((s) => s.id),
    );
    printSummaryTable(counts);
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
