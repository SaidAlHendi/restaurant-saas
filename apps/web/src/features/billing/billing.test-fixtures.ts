import type { BillingOverviewResponse, EntitlementsSnapshot } from '@app/shared';

export const NOW = new Date('2026-10-14T12:00:00.000Z');

export function isoInDays(days: number): string {
  return new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function entitlements(overrides: Partial<EntitlementsSnapshot> = {}): EntitlementsSnapshot {
  return {
    planKey: 'restaurant',
    reason: 'trial',
    status: 'trialing',
    trialEndsAt: isoInDays(10),
    currentPeriodEnd: null,
    features: ['menu.multilang', 'menu.branding', 'menu.table_qr', 'pos.access', 'kds.access', 'reports.basic'],
    limits: { 'limit.users_per_branch': 10, 'limit.devices_per_branch': 4 },
    ...overrides,
  };
}

const PLANS: BillingOverviewResponse['plans'] = [
  {
    key: 'free',
    name: 'Free',
    priceMinor: 0,
    currency: 'USD',
    interval: 'month',
    perBranch: false,
    sortOrder: 0,
    features: [],
    limits: { 'limit.products': 40, 'limit.users_per_branch': 1 },
    paddlePriceId: null,
  },
  {
    key: 'menu',
    name: 'Menu',
    priceMinor: 900,
    currency: 'USD',
    interval: 'month',
    perBranch: false,
    sortOrder: 1,
    features: ['menu.multilang', 'menu.branding', 'menu.table_qr'],
    limits: { 'limit.users_per_branch': 1 },
    paddlePriceId: 'pri_menu',
  },
  {
    key: 'restaurant',
    name: 'Restaurant',
    priceMinor: 2900,
    currency: 'USD',
    interval: 'month',
    perBranch: true,
    sortOrder: 2,
    features: ['menu.multilang', 'pos.access', 'kds.access', 'reports.basic'],
    limits: { 'limit.users_per_branch': 10 },
    paddlePriceId: 'pri_restaurant',
  },
  {
    key: 'business',
    name: 'Business',
    priceMinor: 5900,
    currency: 'USD',
    interval: 'month',
    perBranch: true,
    sortOrder: 3,
    features: ['pos.access', 'kds.access', 'reports.advanced'],
    limits: { 'limit.users_per_branch': 10 },
    paddlePriceId: 'pri_business',
  },
];

/** A trialing org with checkout enabled; override pieces per scenario. */
export function overview(
  overrides: {
    entitlements?: Partial<EntitlementsSnapshot>;
    subscription?: Partial<NonNullable<BillingOverviewResponse['subscription']>> | null;
    checkoutEnabled?: boolean;
  } = {},
): BillingOverviewResponse {
  return {
    entitlements: entitlements(overrides.entitlements),
    subscription:
      overrides.subscription === null
        ? null
        : {
            provider: null,
            providerCustomerId: null,
            providerSubscriptionId: null,
            branchQuantity: 1,
            canceledAt: null,
            scheduledChange: null,
            ...overrides.subscription,
          },
    checkoutEnabled: overrides.checkoutEnabled ?? true,
    plans: PLANS,
  };
}

/** A paying Paddle customer on `planKey`. */
export function paidOverview(
  planKey: EntitlementsSnapshot['planKey'],
  overrides: {
    entitlements?: Partial<EntitlementsSnapshot>;
    subscription?: Partial<NonNullable<BillingOverviewResponse['subscription']>>;
    checkoutEnabled?: boolean;
  } = {},
): BillingOverviewResponse {
  return overview({
    checkoutEnabled: overrides.checkoutEnabled,
    entitlements: {
      planKey,
      reason: 'paid',
      status: 'active',
      trialEndsAt: null,
      currentPeriodEnd: isoInDays(20),
      ...overrides.entitlements,
    },
    subscription: {
      provider: 'paddle',
      providerCustomerId: 'ctm_1',
      providerSubscriptionId: 'sub_1',
      ...overrides.subscription,
    },
  });
}
