import {
  FEATURE_KEYS,
  PLAN_FEATURE_SEED,
  PLAN_KEYS,
  type BillingOverviewResponse,
  type EntitlementsSnapshot,
  type FeatureKey,
  type PlanKey,
} from '@app/shared';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The trial banner shows only in the last days of the trial. */
export const TRIAL_BANNER_DAYS = 3;

/** Whole days left until `iso` (rounded up, never negative). */
export function daysUntil(iso: string, now: Date): number {
  const diff = new Date(iso).getTime() - now.getTime();
  if (Number.isNaN(diff) || diff <= 0) {
    return 0;
  }
  return Math.ceil(diff / DAY_MS);
}

export type BillingBanner =
  | { kind: 'trial'; daysLeft: number }
  | { kind: 'trial_expired' }
  | { kind: 'past_due' };

/** Banner above every dashboard screen; only for people who can fix billing. */
export function billingBanner(
  entitlements: EntitlementsSnapshot | null,
  canManageBilling: boolean,
  now: Date,
): BillingBanner | null {
  if (!canManageBilling || entitlements === null) {
    return null;
  }
  switch (entitlements.reason) {
    case 'trial': {
      if (entitlements.trialEndsAt === null) {
        return null;
      }
      const daysLeft = daysUntil(entitlements.trialEndsAt, now);
      return daysLeft <= TRIAL_BANNER_DAYS ? { kind: 'trial', daysLeft } : null;
    }
    case 'trial_expired':
      return { kind: 'trial_expired' };
    case 'past_due':
      return { kind: 'past_due' };
    default:
      return null;
  }
}

export type ScheduledChange = { action: string; effectiveAt: string | null };

/** Paddle's `scheduled_change` as stored on the subscription (`{ action, effective_at }`). */
export function parseScheduledChange(raw: unknown): ScheduledChange | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const action = typeof record['action'] === 'string' ? record['action'] : 'unknown';
  const effectiveAt = typeof record['effective_at'] === 'string' ? record['effective_at'] : null;
  return { action, effectiveAt };
}

/** Same rule as the API: a Paddle subscription that change-plan (not checkout) must handle. */
export function hasLivePaddleSubscription(overview: BillingOverviewResponse, now: Date): boolean {
  const { subscription, entitlements } = overview;
  if (subscription === null || subscription.provider !== 'paddle') {
    return false;
  }
  if (subscription.providerSubscriptionId === null) {
    return false;
  }
  if (entitlements.status === 'active' || entitlements.status === 'past_due') {
    return true;
  }
  if (entitlements.status === 'canceled') {
    return (
      entitlements.currentPeriodEnd !== null &&
      new Date(entitlements.currentPeriodEnd).getTime() > now.getTime()
    );
  }
  return false;
}

/**
 * What the button on a plan card does:
 * - `subscribe`: open Paddle checkout (no live Paddle subscription yet).
 * - `change`: switch the live subscription (to `free` = cancel at period end).
 * - `keep`: the current plan has a pending cancel; remove it.
 * - `current`: the plan in use, nothing to do.
 * - `none`: no button.
 */
export type PlanAction = 'subscribe' | 'change' | 'keep' | 'current' | 'none';

export function planAction(
  overview: BillingOverviewResponse,
  planKey: PlanKey,
  now: Date,
): PlanAction {
  const { entitlements } = overview;
  const isCurrent = entitlements.planKey === planKey;

  if (hasLivePaddleSubscription(overview, now)) {
    if (isCurrent) {
      const pending = parseScheduledChange(overview.subscription?.scheduledChange) !== null;
      return pending && overview.checkoutEnabled ? 'keep' : 'current';
    }
    return overview.checkoutEnabled ? 'change' : 'none';
  }

  // Comped orgs (demo, partners) are not asked to pay.
  if (entitlements.reason === 'comp') {
    return isCurrent ? 'current' : 'none';
  }
  if (planKey === 'free') {
    return isCurrent ? 'current' : 'none';
  }
  if (!overview.checkoutEnabled) {
    return isCurrent && entitlements.reason !== 'trial' ? 'current' : 'none';
  }
  return 'subscribe';
}

/** When to stop polling after an action: the webhook has changed the subscription. */
export type BillingSettledCheck = (overview: BillingOverviewResponse) => boolean;

export function settledAfterCheckout(planKey: PlanKey): BillingSettledCheck {
  return (overview) =>
    overview.entitlements.planKey === planKey && overview.entitlements.reason === 'paid';
}

export function settledAfterChange(planKey: PlanKey): BillingSettledCheck {
  if (planKey === 'free') {
    return (overview) => parseScheduledChange(overview.subscription?.scheduledChange) !== null;
  }
  return (overview) => overview.entitlements.planKey === planKey;
}

export const settledAfterKeep: BillingSettledCheck = (overview) =>
  parseScheduledChange(overview.subscription?.scheduledChange) === null;

/** Feature keys in display order, for the plan comparison cards. */
export function planFeatureList(features: readonly string[]): FeatureKey[] {
  return FEATURE_KEYS.filter((key) => features.includes(key));
}

/** The cheapest plan that includes `feature` (plans are ordered by price). */
export function cheapestPlanWithFeature(feature: string): PlanKey | null {
  for (const planKey of PLAN_KEYS) {
    if (PLAN_FEATURE_SEED[planKey].some((row) => row.key === feature)) {
      return planKey;
    }
  }
  return null;
}

/** Sidebar items that need a plan feature. Missing feature = shown with a lock. */
export const NAV_ITEM_FEATURE: Readonly<Record<string, FeatureKey>> = {
  today: 'reports.basic',
  orders: 'reports.basic',
  cashier: 'pos.access',
  kitchen: 'kds.access',
};

export function isNavItemLocked(
  itemId: string,
  entitlements: EntitlementsSnapshot | null,
): boolean {
  const feature = NAV_ITEM_FEATURE[itemId];
  if (feature === undefined || entitlements === null) {
    return false;
  }
  return !entitlements.features.includes(feature);
}
