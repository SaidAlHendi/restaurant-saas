import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import { ENV, type Env } from '../../config/config.module';
import * as schema from './schema/index';

export const WORKER_DRIZZLE = Symbol('WORKER_DRIZZLE');
export const WORKER_PG_POOL = Symbol('WORKER_PG_POOL');

export type WorkerDrizzleDb = NodePgDatabase<typeof schema>;

export type WorkerDrizzleTx = Parameters<Parameters<WorkerDrizzleDb['transaction']>[0]>[0];

@Module({
  providers: [
    {
      provide: WORKER_PG_POOL,
      inject: [ENV],
      useFactory: (env: Env) => {
        const url = env.DATABASE_WORKER_URL;
        if (!url) {
          throw new Error('DATABASE_WORKER_URL is required for WorkerDbModule');
        }
        return new pg.Pool({ connectionString: url });
      },
    },
    {
      provide: WORKER_DRIZZLE,
      inject: [WORKER_PG_POOL],
      useFactory: (pool: pg.Pool): WorkerDrizzleDb => drizzle(pool, { schema }),
    },
  ],
  exports: [WORKER_DRIZZLE, WORKER_PG_POOL],
})
export class WorkerDbModule implements OnModuleDestroy {
  constructor(@Inject(WORKER_PG_POOL) private readonly pool: pg.Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
