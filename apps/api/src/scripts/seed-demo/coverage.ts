export type SeedCoverageEntry = 'seeded' | { skipped: string };

/** Every Drizzle `pgTable` in core/db/schema must appear here (see coverage.spec.ts). */
export const SEED_COVERAGE: Record<string, SeedCoverageEntry> = {
  organizations: 'seeded',
  branches: 'seeded',
  roles: { skipped: 'system roles only (migration 0003)' },
  role_permissions: { skipped: 'system roles only (migration 0003)' },
  memberships: 'seeded',
  membership_branches: 'seeded',
  users: 'seeded',
  auth_sessions: { skipped: 'runtime only (login creates rows)' },
  categories: 'seeded',
  products: 'seeded',
  modifier_groups: 'seeded',
  modifiers: 'seeded',
  product_modifier_groups: 'seeded',
  tables: 'seeded',
  branch_counters: 'seeded',
  orders: 'seeded',
  order_items: 'seeded',
  order_item_modifiers: 'seeded',
  payments: 'seeded',
  order_events: 'seeded',
  outbox_events: {
    skipped: 'written by order commands; KDS loads active orders over HTTP',
  },
  plans: { skipped: 'seeded in migration 0012' },
  plan_features: { skipped: 'seeded in migration 0012' },
  subscriptions: 'seeded',
  billing_events: { skipped: 'runtime webhook idempotency log' },
};
