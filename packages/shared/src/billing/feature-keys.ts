import type { PlanKey } from './plan-keys.js';

/** Feature entitlements (boolean). */
export const FEATURE_KEYS = [
  'menu.multilang',
  'menu.branding',
  'menu.table_qr',
  'pos.access',
  'kds.access',
  'reports.basic',
  'reports.advanced',
  'reports.export',
  'branches.multi',
  'roles.custom',
  'ordering.table_qr',
  'api.access',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

/** Numeric limits (missing row on a plan = unlimited). */
export const LIMIT_KEYS = [
  'limit.products',
  'limit.users_per_branch',
  'limit.devices_per_branch',
] as const;

export type LimitKey = (typeof LIMIT_KEYS)[number];

export function isLimitKey(key: string): key is LimitKey {
  return (LIMIT_KEYS as readonly string[]).includes(key);
}

export function isFeatureKey(key: string): key is FeatureKey {
  return (FEATURE_KEYS as readonly string[]).includes(key);
}

/** Expected plan_features rows per plan (must match migration 0012). */
export const PLAN_FEATURE_SEED: Record<
  PlanKey,
  ReadonlyArray<{ key: string; limitValue: number | null }>
> = {
  free: [
    { key: 'limit.products', limitValue: 40 },
    { key: 'limit.users_per_branch', limitValue: 1 },
  ],
  menu: [
    { key: 'menu.multilang', limitValue: null },
    { key: 'menu.branding', limitValue: null },
    { key: 'menu.table_qr', limitValue: null },
    { key: 'limit.users_per_branch', limitValue: 1 },
  ],
  restaurant: [
    { key: 'menu.multilang', limitValue: null },
    { key: 'menu.branding', limitValue: null },
    { key: 'menu.table_qr', limitValue: null },
    { key: 'pos.access', limitValue: null },
    { key: 'kds.access', limitValue: null },
    { key: 'reports.basic', limitValue: null },
    { key: 'limit.users_per_branch', limitValue: 10 },
    { key: 'limit.devices_per_branch', limitValue: 4 },
  ],
  business: [
    { key: 'menu.multilang', limitValue: null },
    { key: 'menu.branding', limitValue: null },
    { key: 'menu.table_qr', limitValue: null },
    { key: 'pos.access', limitValue: null },
    { key: 'kds.access', limitValue: null },
    { key: 'reports.basic', limitValue: null },
    { key: 'limit.users_per_branch', limitValue: 10 },
    { key: 'limit.devices_per_branch', limitValue: 4 },
    { key: 'reports.advanced', limitValue: null },
    { key: 'reports.export', limitValue: null },
    { key: 'branches.multi', limitValue: null },
    { key: 'roles.custom', limitValue: null },
    { key: 'ordering.table_qr', limitValue: null },
    { key: 'api.access', limitValue: null },
  ],
};
