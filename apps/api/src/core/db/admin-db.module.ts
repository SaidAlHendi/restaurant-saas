import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import { ENV, type Env } from '../../config/config.module';
import { AdminDatabaseRoleValidator } from './admin-database-role.validator';
import { ADMIN_DRIZZLE, ADMIN_PG_POOL, type AdminDrizzleDb } from './admin-db.tokens';
import * as schema from './schema/index';

/** Second pool, connected as `app_admin` (BYPASSRLS, narrow grants). Only the admin module may use it. */
@Module({
  providers: [
    {
      provide: ADMIN_PG_POOL,
      inject: [ENV],
      useFactory: (env: Env) => {
        if (!env.DATABASE_ADMIN_URL) {
          throw new Error('DATABASE_ADMIN_URL is required for AdminDbModule');
        }
        return new pg.Pool({ connectionString: env.DATABASE_ADMIN_URL });
      },
    },
    {
      provide: ADMIN_DRIZZLE,
      inject: [ADMIN_PG_POOL],
      useFactory: (pool: pg.Pool): AdminDrizzleDb => drizzle(pool, { schema }),
    },
    AdminDatabaseRoleValidator,
  ],
  exports: [ADMIN_DRIZZLE, ADMIN_PG_POOL],
})
export class AdminDbModule implements OnModuleDestroy {
  constructor(@Inject(ADMIN_PG_POOL) private readonly pool: pg.Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
