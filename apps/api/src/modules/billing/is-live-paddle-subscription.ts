import type { PlanKey } from '@app/shared';

export type LiveSubCheckRow = {
  provider: 'paddle' | null;
  status: 'trialing' | 'active' | 'past_due' | 'canceled';
  currentPeriodEnd: Date | null;
  providerSubscriptionId: string | null;
  planKey?: PlanKey;
};

/** Live tracked Paddle subscription (checkout must use change-plan). */
export function isLivePaddleSubscription(row: LiveSubCheckRow, now: Date): boolean {
  if (row.provider !== 'paddle') {
    return false;
  }
  if (row.status === 'active' || row.status === 'past_due') {
    return true;
  }
  if (row.status === 'canceled') {
    return row.currentPeriodEnd !== null && row.currentPeriodEnd.getTime() > now.getTime();
  }
  return false;
}
