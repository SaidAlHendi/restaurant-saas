import { parseApiError } from '../../lib/api-error-message.js';

export type PlanGate =
  | { kind: 'feature'; feature: string | null }
  | { kind: 'limit'; limit: string | null; max: number | null };

/** The plan error behind a failed request, or null for any other error. */
export function planGateFromError(error: unknown): PlanGate | null {
  const parsed = parseApiError(error);
  const details = parsed.details ?? {};
  if (parsed.code === 'PLAN_FEATURE_REQUIRED') {
    const feature = details['feature'];
    return { kind: 'feature', feature: typeof feature === 'string' ? feature : null };
  }
  if (parsed.code === 'PLAN_LIMIT_REACHED') {
    const limit = details['limit'];
    const max = details['max'];
    return {
      kind: 'limit',
      limit: typeof limit === 'string' ? limit : null,
      max: typeof max === 'number' ? max : null,
    };
  }
  return null;
}

/** i18n key for a plan limit message (`{{max}}` is filled by the caller). */
export function planLimitMessageKey(limit: string | null): string {
  switch (limit) {
    case 'limit.products':
      return 'billing.limits.productsReached';
    case 'limit.users_per_branch':
      return 'billing.limits.usersReached';
    case 'limit.devices_per_branch':
      return 'billing.limits.devicesReached';
    default:
      return 'billing.limits.generic';
  }
}

/** i18n key for billing endpoint errors, or null to fall back to the generic message. */
export function billingErrorMessageKey(error: unknown): string | null {
  switch (parseApiError(error).code) {
    case 'BILLING_USE_CHANGE_PLAN':
      return 'billing.errors.useChangePlan';
    case 'BILLING_NO_SUBSCRIPTION':
      return 'billing.errors.noSubscription';
    case 'BILLING_PROVIDER_ERROR':
      return 'billing.errors.provider';
    case 'CONFLICT':
      return 'billing.errors.alreadyOnPlan';
    default:
      return null;
  }
}
