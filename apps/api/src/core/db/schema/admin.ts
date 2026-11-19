import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Platform-admin identity plane. Deliberately separate from `users` / `auth_sessions`: no tenant
 * membership, no RLS, and only the `app_admin` database role can touch these tables.
 */
export const adminRoleEnum = pgEnum('admin_role', ['super', 'support', 'billing']);

export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: adminRoleEnum('role').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const adminSessions = pgTable(
  'admin_sessions',
  {
    id: uuid('id').primaryKey(),
    adminUserId: uuid('admin_user_id')
      .notNull()
      .references(() => adminUsers.id),
    tokenHash: text('token_hash').notNull(),
    familyId: uuid('family_id').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedBy: uuid('replaced_by'),
    userAgent: text('user_agent'),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('admin_sessions_token_hash_unique').on(t.tokenHash),
    index('admin_sessions_family_idx').on(t.familyId),
  ],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey(),
    adminUserId: uuid('admin_user_id')
      .notNull()
      .references(() => adminUsers.id),
    actorRole: adminRoleEnum('actor_role').notNull(),
    action: text('action').notNull(),
    targetType: text('target_type'),
    targetId: text('target_id'),
    orgId: uuid('org_id'),
    payload: jsonb('payload').notNull().default({}),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('audit_logs_admin_user_created_idx').on(t.adminUserId, t.createdAt)],
);
