import { describe, expect, it } from 'vitest';

import { billingErrorMessageKey, planGateFromError, planLimitMessageKey } from './plan-gate.utils.js';

function apiError(status: number, code: string, details: Record<string, unknown> = {}) {
  return { status, data: { error: { code, message: 'x', details } } };
}

describe('planGateFromError', () => {
  it('maps PLAN_FEATURE_REQUIRED to a feature gate', () => {
    expect(
      planGateFromError(apiError(403, 'PLAN_FEATURE_REQUIRED', { feature: 'pos.access', planKey: 'free' })),
    ).toEqual({ kind: 'feature', feature: 'pos.access' });
  });

  it('maps PLAN_LIMIT_REACHED to a limit gate with the max', () => {
    expect(
      planGateFromError(
        apiError(403, 'PLAN_LIMIT_REACHED', { limit: 'limit.products', max: 40, planKey: 'free' }),
      ),
    ).toEqual({ kind: 'limit', limit: 'limit.products', max: 40 });
  });

  it('ignores other errors', () => {
    expect(planGateFromError(apiError(403, 'FORBIDDEN'))).toBeNull();
    expect(planGateFromError(new Error('network'))).toBeNull();
  });
});

describe('planLimitMessageKey', () => {
  it('has a message per limit and a fallback', () => {
    expect(planLimitMessageKey('limit.products')).toBe('billing.limits.productsReached');
    expect(planLimitMessageKey('limit.users_per_branch')).toBe('billing.limits.usersReached');
    expect(planLimitMessageKey(null)).toBe('billing.limits.generic');
  });
});

describe('billingErrorMessageKey', () => {
  it('maps the billing error codes', () => {
    expect(billingErrorMessageKey(apiError(409, 'BILLING_USE_CHANGE_PLAN'))).toBe(
      'billing.errors.useChangePlan',
    );
    expect(billingErrorMessageKey(apiError(409, 'BILLING_NO_SUBSCRIPTION'))).toBe(
      'billing.errors.noSubscription',
    );
    expect(billingErrorMessageKey(apiError(502, 'BILLING_PROVIDER_ERROR'))).toBe(
      'billing.errors.provider',
    );
    expect(billingErrorMessageKey(apiError(400, 'VALIDATION_ERROR'))).toBeNull();
  });
});
