import { boolean, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { organizations } from './tenancy';

export const platformRoleEnum = pgEnum('platform_role', ['super', 'support', 'billing']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  locale: text('locale').notNull().default('en'),
  isPlatformAdmin: boolean('is_platform_admin').notNull().default(false),
  platformRole: platformRoleEnum('platform_role'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  lastOrgId: uuid('last_org_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const authSessions = pgTable('auth_sessions', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  familyId: uuid('family_id').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  replacedBy: uuid('replaced_by'),
  userAgent: text('user_agent'),
  ip: text('ip'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
