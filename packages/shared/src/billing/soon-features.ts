import type { FeatureKey, LimitKey } from './feature-keys.js';

/**
 * Plan services that exist as plan data only: no feature behind them and no enforcement.
 * Every place that lists a plan's services shows these with a "Soon" badge. When one ships,
 * remove it from this list (the API test fails while a key here is still enforced).
 */
export const SOON_FEATURE_KEYS = [
  'limit.devices_per_branch',
  'branches.multi',
  'roles.custom',
  'reports.advanced',
  'reports.export',
  'ordering.table_qr',
  'api.access',
] as const satisfies ReadonlyArray<FeatureKey | LimitKey>;

export type SoonFeatureKey = (typeof SOON_FEATURE_KEYS)[number];

export function isFeatureSoon(key: string): key is SoonFeatureKey {
  return (SOON_FEATURE_KEYS as readonly string[]).includes(key);
}
