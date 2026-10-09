import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const orgStatusEnum = pgEnum('org_status', [
  'trial',
  'active',
  'past_due',
  'suspended',
  'cancelled',
]);

export const membershipStatusEnum = pgEnum('membership_status', ['active', 'invited', 'disabled']);

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  country: text('country').notNull(),
  defaultCurrency: text('default_currency').notNull(),
  defaultLocale: text('default_locale').notNull(),
  locales: text('locales').array().notNull(),
  logoKey: text('logo_key'),
  status: orgStatusEnum('status').notNull().default('trial'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const branches = pgTable(
  'branches',
  {
    id: uuid('id').primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    timezone: text('timezone').notNull(),
    currency: text('currency').notNull(),
    taxRateBp: integer('tax_rate_bp').notNull().default(0),
    taxInclusive: boolean('tax_inclusive').notNull().default(false),
    dayStartHour: integer('day_start_hour').notNull().default(4),
    address: text('address'),
    receiptHeader: text('receipt_header'),
    receiptFooter: text('receipt_footer'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('branches_org_slug_unique').on(t.orgId, t.slug),
    unique('branches_id_org_id_unique').on(t.id, t.orgId),
  ],
);

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey(),
  orgId: uuid('org_id').references(() => organizations.id),
  key: text('key').notNull(),
  name: text('name').notNull(),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    permissionKey: text('permission_key').notNull(),
    orgId: uuid('org_id').references(() => organizations.id),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionKey] })],
);

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    userId: uuid('user_id').notNull(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    pinHash: text('pin_hash'),
    allBranches: boolean('all_branches').notNull().default(true),
    status: membershipStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('memberships_org_user_unique').on(t.orgId, t.userId)],
);

export const membershipBranches = pgTable(
  'membership_branches',
  {
    membershipId: uuid('membership_id')
      .notNull()
      .references(() => memberships.id),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
  },
  (t) => [primaryKey({ columns: [t.membershipId, t.branchId] })],
);
