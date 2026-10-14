import type { PlanKey } from '@app/shared';

import {
  resolveEffectivePlan,
  type SubscriptionForPlanResolve,
} from './resolve-effective-plan';

const NOW = new Date('2026-06-15T12:00:00.000Z');
const FUTURE = new Date('2026-07-01T00:00:00.000Z');
const PAST = new Date('2026-06-01T00:00:00.000Z');

function sub(
  overrides: Partial<SubscriptionForPlanResolve> & Pick<SubscriptionForPlanResolve, 'status'>,
): SubscriptionForPlanResolve {
  return {
    planKey: 'restaurant',
    provider: null,
    trialEndsAt: null,
    currentPeriodEnd: null,
    ...overrides,
  };
}

describe('resolveEffectivePlan', () => {
  it('returns free none when subscription is null', () => {
    expect(resolveEffectivePlan(null, NOW)).toEqual({ planKey: 'free', reason: 'none' });
  });

  describe('trialing', () => {
    it('uses plan when trial not expired', () => {
      expect(
        resolveEffectivePlan(sub({ status: 'trialing', trialEndsAt: FUTURE }), NOW),
      ).toEqual({ planKey: 'restaurant', reason: 'trial' });
    });

    it('free trial_expired when trialEndsAt in the past', () => {
      expect(
        resolveEffectivePlan(sub({ status: 'trialing', trialEndsAt: PAST }), NOW),
      ).toEqual({ planKey: 'free', reason: 'trial_expired' });
    });

    it('free trial_expired when trialEndsAt is null', () => {
      expect(
        resolveEffectivePlan(sub({ status: 'trialing', trialEndsAt: null }), NOW),
      ).toEqual({ planKey: 'free', reason: 'trial_expired' });
    });
  });

  describe('active', () => {
    it('comp when provider null', () => {
      expect(resolveEffectivePlan(sub({ status: 'active', provider: null }), NOW)).toEqual({
        planKey: 'restaurant',
        reason: 'comp',
      });
    });

    it('paid when paddle provider', () => {
      expect(
        resolveEffectivePlan(sub({ status: 'active', provider: 'paddle' }), NOW),
      ).toEqual({ planKey: 'restaurant', reason: 'paid' });
    });
  });

  it('past_due keeps plan', () => {
    expect(resolveEffectivePlan(sub({ status: 'past_due', provider: 'paddle' }), NOW)).toEqual({
      planKey: 'restaurant',
      reason: 'past_due',
    });
  });

  describe('canceled', () => {
    it('keeps plan until period end', () => {
      expect(
        resolveEffectivePlan(
          sub({ status: 'canceled', provider: 'paddle', currentPeriodEnd: FUTURE }),
          NOW,
        ),
      ).toEqual({ planKey: 'restaurant', reason: 'canceled' });
    });

    it('free canceled when period ended', () => {
      expect(
        resolveEffectivePlan(
          sub({ status: 'canceled', provider: 'paddle', currentPeriodEnd: PAST }),
          NOW,
        ),
      ).toEqual({ planKey: 'free', reason: 'canceled' });
    });

    it('free canceled when currentPeriodEnd null', () => {
      expect(
        resolveEffectivePlan(sub({ status: 'canceled', provider: 'paddle' }), NOW),
      ).toEqual({ planKey: 'free', reason: 'canceled' });
    });
  });

  it.each(['free', 'menu', 'restaurant', 'business'] satisfies PlanKey[])(
    'preserves plan key for active comp plan %s',
    (planKey) => {
      expect(
        resolveEffectivePlan(sub({ status: 'active', planKey, provider: null }), NOW),
      ).toEqual({ planKey, reason: 'comp' });
    },
  );
});
