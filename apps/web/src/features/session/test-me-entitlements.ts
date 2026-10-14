import type { MeResponse } from '@app/shared';

/** Minimal entitlements for unit tests after /me gained entitlements. */
export const testMeEntitlements: MeResponse['entitlements'] = {
  planKey: 'business',
  reason: 'comp',
  status: 'active',
  trialEndsAt: null,
  currentPeriodEnd: null,
  features: ['pos.access', 'menu.read', 'reports.basic'],
  limits: {},
};
