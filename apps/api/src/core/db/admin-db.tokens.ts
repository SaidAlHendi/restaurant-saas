import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type * as schema from './schema/index';

export const ADMIN_DRIZZLE = Symbol('ADMIN_DRIZZLE');
export const ADMIN_PG_POOL = Symbol('ADMIN_PG_POOL');

export type AdminDrizzleDb = NodePgDatabase<typeof schema>;
export type AdminDrizzleTx = Parameters<Parameters<AdminDrizzleDb['transaction']>[0]>[0];
