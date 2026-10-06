import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DRIZZLE, type DrizzleDb } from './db.module';

@Injectable()
export class DatabaseRoleValidator implements OnModuleInit {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async onModuleInit(): Promise<void> {
    const result = await this.db.execute(
      sql`SELECT rolsuper AS super, rolbypassrls AS bypass FROM pg_roles WHERE rolname = current_user`,
    );
    const row = result.rows[0] as { super: boolean; bypass: boolean } | undefined;
    if (!row) {
      throw new Error('Database role validation failed: could not read pg_roles');
    }
    if (row.super || row.bypass) {
      throw new Error(
        'DATABASE_URL must use app_user (NOSUPERUSER, NOBYPASSRLS). Refusing to start.',
      );
    }
  }
}
