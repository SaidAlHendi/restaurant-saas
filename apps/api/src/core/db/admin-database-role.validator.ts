import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { ADMIN_DRIZZLE, type AdminDrizzleDb } from './admin-db.tokens';

/** Fails startup when DATABASE_ADMIN_URL is not the narrow BYPASSRLS role the admin plane relies on. */
@Injectable()
export class AdminDatabaseRoleValidator implements OnModuleInit {
  constructor(@Inject(ADMIN_DRIZZLE) private readonly db: AdminDrizzleDb) {}

  async onModuleInit(): Promise<void> {
    const result = await this.db.execute(sql`
      SELECT
        r.rolsuper AS super,
        r.rolbypassrls AS bypass,
        has_column_privilege(current_user, 'public.users', 'password_hash', 'SELECT') AS reads_password_hash,
        has_table_privilege(current_user, 'public.organizations', 'DELETE') AS deletes_orgs,
        has_table_privilege(current_user, 'public.audit_logs', 'INSERT') AS writes_audit,
        has_table_privilege(current_user, 'public.admin_users', 'SELECT') AS reads_admin_users
      FROM pg_roles r WHERE r.rolname = current_user`);
    const row = result.rows[0] as
      | {
          super: boolean;
          bypass: boolean;
          reads_password_hash: boolean;
          deletes_orgs: boolean;
          writes_audit: boolean;
          reads_admin_users: boolean;
        }
      | undefined;
    if (!row) {
      throw new Error('Admin database role validation failed: could not read pg_roles');
    }
    if (row.super) {
      throw new Error('DATABASE_ADMIN_URL must not use a superuser. Refusing to start.');
    }
    if (!row.bypass) {
      throw new Error('DATABASE_ADMIN_URL must use app_admin (BYPASSRLS). Refusing to start.');
    }
    if (row.reads_password_hash || row.deletes_orgs) {
      throw new Error(
        'DATABASE_ADMIN_URL role has broader grants than app_admin should (password_hash read or DELETE). Refusing to start.',
      );
    }
    if (!row.writes_audit || !row.reads_admin_users) {
      throw new Error(
        'DATABASE_ADMIN_URL role is missing app_admin grants. Create the role (infra/postgres/init/01-roles.sql) before running db:migrate. Refusing to start.',
      );
    }
  }
}
