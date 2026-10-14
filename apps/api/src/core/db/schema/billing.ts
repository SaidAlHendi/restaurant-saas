import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { organizations } from './tenancy';

export const planIntervalEnum = pgEnum('plan_interval', ['month']);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
]);

export const billingProviderEnum = pgEnum('billing_provider', ['paddle']);

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  priceMinor: bigint('price_minor', { mode: 'number' }).notNull(),
  currency: text('currency').notNull().default('USD'),
  interval: planIntervalEnum('interval').notNull().default('month'),
  perBranch: boolean('per_branch').notNull().default(false),
  isPublic: boolean('is_public').notNull().default(true),
  sortOrder: smallint('sort_order').notNull(),
});

export const planFeatures = pgTable(
  'plan_features',
  {
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'cascade' }),
    featureKey: text('feature_key').notNull(),
    limitValue: integer('limit_value'),
  },
  (t) => [primaryKey({ columns: [t.planId, t.featureKey] })],
);

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey(),
  orgId: uuid('org_id')
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id')
    .notNull()
    .references(() => plans.id),
  status: subscriptionStatusEnum('status').notNull(),
  branchQuantity: integer('branch_quantity').notNull().default(1),
  provider: billingProviderEnum('provider'),
  providerCustomerId: text('provider_customer_id'),
  providerSubscriptionId: text('provider_subscription_id').unique(),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  scheduledChange: jsonb('scheduled_change'),
  providerEventAt: timestamp('provider_event_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const billingEvents = pgTable('billing_events', {
  id: uuid('id').primaryKey(),
  provider: billingProviderEnum('provider').notNull().default('paddle'),
  providerEventId: text('provider_event_id').notNull().unique(),
  type: text('type').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  payload: jsonb('payload').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  error: text('error'),
});
