import type { AdminOrgDetail } from '@app/shared';

const DAY_MS = 24 * 60 * 60 * 1000;
const ENDING_SOON_DAYS = 7;

export type PlanState = 'active' | 'trial' | 'endingSoon' | 'pastDue' | 'ended' | 'none';

/** Banner and tab-bar colors per state. */
export const PLAN_TONE: Record<PlanState, string> = {
  active: 'bg-primary text-primary-foreground',
  trial: 'bg-primary text-primary-foreground',
  endingSoon: 'bg-warning text-warning-foreground',
  pastDue: 'bg-warning text-warning-foreground',
  ended: 'bg-destructive text-destructive-foreground',
  none: 'bg-muted text-foreground',
};

export interface PlanSummary {
  state: PlanState;
  endsAt: string | null;
  /** Whole days left, rounded up; null when there is no end date or it has passed. */
  daysLeft: number | null;
  productLimit: number | null;
  /** 0-100, only when the plan limits products. */
  productUsePercent: number | null;
  userLimit: number | null;
}

/** What the plan banner says about the restaurant's current plan. */
export function summarizePlan(restaurant: AdminOrgDetail, now: Date = new Date()): PlanSummary {
  const { subscription, planDetail } = restaurant;
  const onTrial = subscription?.status === 'trialing';
  const endsAt = (onTrial ? subscription.trialEndsAt : subscription?.currentPeriodEnd) ?? null;
  const msLeft = endsAt ? new Date(endsAt).getTime() - now.getTime() : null;
  const daysLeft = msLeft !== null && msLeft > 0 ? Math.ceil(msLeft / DAY_MS) : null;

  let state: PlanState = onTrial ? 'trial' : 'active';
  if (!subscription || !restaurant.planName) state = 'none';
  else if (subscription.status === 'canceled' || (msLeft !== null && msLeft <= 0)) state = 'ended';
  else if (subscription.status === 'past_due') state = 'pastDue';
  else if (daysLeft !== null && daysLeft <= ENDING_SOON_DAYS) state = 'endingSoon';

  const limitOf = (key: string) =>
    planDetail?.features.find((feature) => feature.key === key)?.limit ?? null;
  const productLimit = limitOf('limit.products');

  return {
    state,
    endsAt,
    daysLeft,
    productLimit,
    productUsePercent: productLimit
      ? Math.min(100, Math.round((restaurant.catalog.productCount / productLimit) * 100))
      : null,
    userLimit: limitOf('limit.users_per_branch'),
  };
}

/**
 * Date the activation form starts on: one month (the common bank-transfer cycle) after the current
 * end date, or after today if there is none, so saving the default never shortens a plan.
 */
export function defaultActivateUntil(
  restaurant: AdminOrgDetail | undefined,
  now: Date = new Date(),
): string {
  const subscription = restaurant?.subscription;
  const ends = [subscription?.trialEndsAt, subscription?.currentPeriodEnd].flatMap((iso) =>
    iso ? [new Date(iso).getTime()] : [],
  );
  const next = new Date(Math.max(now.getTime(), ...ends));
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next.toISOString().slice(0, 10);
}
