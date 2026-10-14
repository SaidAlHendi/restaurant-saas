import type { EntitlementReason, PlanKey } from '@app/shared';

export type SubscriptionForPlanResolve = {
  planKey: PlanKey;
  status: 'trialing' | 'active' | 'past_due' | 'canceled';
  provider: 'paddle' | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
};

export type EffectivePlanResult = {
  planKey: PlanKey;
  reason: EntitlementReason;
};

export function resolveEffectivePlan(
  subscription: SubscriptionForPlanResolve | null,
  now: Date,
): EffectivePlanResult {
  if (subscription === null) {
    return { planKey: 'free', reason: 'none' };
  }

  const nowMs = now.getTime();

  if (subscription.status === 'trialing') {
    if (subscription.trialEndsAt !== null && subscription.trialEndsAt.getTime() > nowMs) {
      return { planKey: subscription.planKey, reason: 'trial' };
    }
    return { planKey: 'free', reason: 'trial_expired' };
  }

  if (subscription.status === 'active') {
    if (subscription.provider === null) {
      return { planKey: subscription.planKey, reason: 'comp' };
    }
    return { planKey: subscription.planKey, reason: 'paid' };
  }

  if (subscription.status === 'past_due') {
    return { planKey: subscription.planKey, reason: 'past_due' };
  }

  if (subscription.status === 'canceled') {
    if (
      subscription.currentPeriodEnd !== null &&
      subscription.currentPeriodEnd.getTime() > nowMs
    ) {
      return { planKey: subscription.planKey, reason: 'canceled' };
    }
    return { planKey: 'free', reason: 'none' };
  }

  return { planKey: 'free', reason: 'none' };
}
