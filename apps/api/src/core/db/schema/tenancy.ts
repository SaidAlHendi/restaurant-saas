import {
  boolean,
  foreignKey,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const posDeviceStatusEnum = pgEnum('pos_device_status', ['pending', 'active', 'revoked']);

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
  /** Currency shown to staff and guests; null = show `defaultCurrency`. */
  displayCurrency: text('display_currency'),
  /** Display-currency units for 1 `defaultCurrency` unit. */
  exchangeRate: numeric('exchange_rate', { precision: 18, scale: 6, mode: 'number' }),
  exchangeRateUpdatedAt: timestamp('exchange_rate_updated_at', { withTimezone: true }),
  displayItemStep: integer('display_item_step').notNull().default(100),
  displayTotalStep: integer('display_total_step').notNull().default(500),
  status: orgStatusEnum('status').notNull().default('active'),
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
    payBeforeSend: boolean('pay_before_send').notNull().default(false),
    acceptsCard: boolean('accepts_card').notNull().default(false),
    pagerEnabled: boolean('pager_enabled').notNull().default(false),
    displayToken: text('display_token'),
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
    pinFailedAttempts: integer('pin_failed_attempts').notNull().default(0),
    pinLockedUntil: timestamp('pin_locked_until', { withTimezone: true }),
    inviteTokenHash: text('invite_token_hash'),
    inviteExpiresAt: timestamp('invite_expires_at', { withTimezone: true }),
    invitedByMembershipId: uuid('invited_by_membership_id'),
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

/** Per-employee permission exceptions on top of the role: `grant` adds a key, `deny` removes it. */
export const membershipPermissionOverrides = pgTable(
  'membership_permission_overrides',
  {
    membershipId: uuid('membership_id')
      .notNull()
      .references(() => memberships.id),
    permissionKey: text('permission_key').notNull(),
    effect: text('effect', { enum: ['grant', 'deny'] }).notNull(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.membershipId, t.permissionKey] })],
);

/** A cashier device linked to one branch. Staff sign in on it with a PIN; the device key never leaves the browser. */
export const posDevices = pgTable(
  'pos_devices',
  {
    id: uuid('id').primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id').notNull(),
    name: text('name').notNull(),
    status: posDeviceStatusEnum('status').notNull().default('pending'),
    pairingCodeHash: text('pairing_code_hash'),
    pairingExpiresAt: timestamp('pairing_expires_at', { withTimezone: true }),
    deviceKeyHash: text('device_key_hash'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => memberships.id),
    pairedAt: timestamp('paired_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('pos_devices_id_org_id_unique').on(t.id, t.orgId),
    foreignKey({
      columns: [t.branchId, t.orgId],
      foreignColumns: [branches.id, branches.orgId],
      name: 'pos_devices_branch_id_org_id_branches_id_org_id_fk',
    }).onDelete('cascade'),
  ],
);
