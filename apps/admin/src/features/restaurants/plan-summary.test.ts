import { describe, expect, it } from 'vitest';

import type { AdminOrgDetail } from '@app/shared';

import { defaultActivateUntil, summarizePlan } from './plan-summary.js';

const NOW = new Date('2026-11-27T12:00:00.000Z');

function restaurant(status: string, end: string | null): AdminOrgDetail {
  return {
    planName: 'Restaurant',
    planDetail: { features: [{ key: 'limit.products', limit: 40 }] },
    catalog: { categoryCount: 1, productCount: 10 },
    subscription: {
      status,
      trialEndsAt: status === 'trialing' ? end : null,
      currentPeriodEnd: status === 'trialing' ? null : end,
    },
  } as AdminOrgDetail;
}

describe('summarizePlan', () => {
  it('counts the days left of a trial and the product use', () => {
    expect(summarizePlan(restaurant('trialing', '2026-12-07T12:00:00.000Z'), NOW)).toMatchObject({
      state: 'trial',
      daysLeft: 10,
      productUsePercent: 25,
    });
  });

  it('warns in the last week and says ended after the end date', () => {
    expect(summarizePlan(restaurant('active', '2026-11-30T12:00:00.000Z'), NOW).state).toBe(
      'endingSoon',
    );
    expect(summarizePlan(restaurant('active', '2026-11-01T12:00:00.000Z'), NOW)).toMatchObject({
      state: 'ended',
      daysLeft: null,
    });
  });

  it('shows overdue payment and plans without an end date', () => {
    expect(summarizePlan(restaurant('past_due', null), NOW).state).toBe('pastDue');
    expect(summarizePlan(restaurant('active', null), NOW).state).toBe('active');
  });
});

describe('defaultActivateUntil', () => {
  it('adds a month to a running plan, or to today when it ended or has no end', () => {
    const until = (end: string | null) => defaultActivateUntil(restaurant('active', end), NOW);
    expect(until('2027-03-10T23:59:59.000Z')).toBe('2027-04-10');
    expect(until('2026-11-01T00:00:00.000Z')).toBe('2026-12-27');
    expect(until(null)).toBe('2026-12-27');
  });
});
