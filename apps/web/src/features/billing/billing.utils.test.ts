import { describe, expect, it } from 'vitest';

import {
  billingBanner,
  cheapestPlanWithFeature,
  daysUntil,
  isNavItemLocked,
  parseScheduledChange,
  planAction,
  settledAfterChange,
  settledAfterCheckout,
  settledAfterKeep,
} from './billing.utils.js';
import { NOW, entitlements, isoInDays, overview, paidOverview } from './billing.test-fixtures.js';

const SCHEDULED_CANCEL = { action: 'cancel', effective_at: isoInDays(20), resume_at: null };

describe('daysUntil', () => {
  it('rounds partial days up and never goes below zero', () => {
    expect(daysUntil(isoInDays(2.5), NOW)).toBe(3);
    expect(daysUntil(isoInDays(-1), NOW)).toBe(0);
  });
});

describe('billingBanner', () => {
  it('hides the trial banner with 5 days left', () => {
    expect(billingBanner(entitlements({ trialEndsAt: isoInDays(5) }), true, NOW)).toBeNull();
  });

  it('shows the trial banner with 3 days left', () => {
    expect(billingBanner(entitlements({ trialEndsAt: isoInDays(3) }), true, NOW)).toEqual({
      kind: 'trial',
      daysLeft: 3,
    });
  });

  it('shows the expired banner after the trial', () => {
    const ent = entitlements({ planKey: 'free', reason: 'trial_expired', trialEndsAt: isoInDays(-1) });
    expect(billingBanner(ent, true, NOW)).toEqual({ kind: 'trial_expired' });
  });

  it('shows the past-due banner', () => {
    const ent = entitlements({ reason: 'past_due', status: 'past_due', trialEndsAt: null });
    expect(billingBanner(ent, true, NOW)).toEqual({ kind: 'past_due' });
  });

  it('shows nothing to people who cannot manage billing', () => {
    const ent = entitlements({ reason: 'past_due', status: 'past_due' });
    expect(billingBanner(ent, false, NOW)).toBeNull();
  });

  it('shows nothing for paid and comped plans', () => {
    expect(billingBanner(entitlements({ reason: 'paid', status: 'active' }), true, NOW)).toBeNull();
    expect(billingBanner(entitlements({ reason: 'comp', status: 'active' }), true, NOW)).toBeNull();
  });
});

describe('parseScheduledChange', () => {
  it('reads Paddle scheduled_change', () => {
    expect(parseScheduledChange(SCHEDULED_CANCEL)).toEqual({
      action: 'cancel',
      effectiveAt: SCHEDULED_CANCEL.effective_at,
    });
    expect(parseScheduledChange(null)).toBeNull();
    expect(parseScheduledChange('cancel')).toBeNull();
  });
});

describe('planAction', () => {
  const actions = (o: Parameters<typeof planAction>[0]) =>
    (['free', 'menu', 'restaurant', 'business'] as const).map((key) => planAction(o, key, NOW));

  it('trial: subscribe to any paid plan, no button on Free', () => {
    expect(actions(overview())).toEqual(['none', 'subscribe', 'subscribe', 'subscribe']);
  });

  it('trial expired: Free is current, paid plans subscribe', () => {
    const o = overview({ entitlements: { planKey: 'free', reason: 'trial_expired' } });
    expect(actions(o)).toEqual(['current', 'subscribe', 'subscribe', 'subscribe']);
  });

  it('paid: current plan disabled, others switch the subscription', () => {
    expect(actions(paidOverview('restaurant'))).toEqual(['change', 'change', 'current', 'change']);
  });

  it('past due still uses change-plan', () => {
    const o = paidOverview('restaurant', {
      entitlements: { reason: 'past_due', status: 'past_due' },
    });
    expect(actions(o)).toEqual(['change', 'change', 'current', 'change']);
  });

  it('scheduled cancel: the current plan offers "keep"', () => {
    const o = paidOverview('restaurant', { subscription: { scheduledChange: SCHEDULED_CANCEL } });
    expect(actions(o)).toEqual(['change', 'change', 'keep', 'change']);
  });

  it('canceled but still in the paid period: change-plan, not checkout', () => {
    const o = paidOverview('menu', {
      entitlements: { reason: 'canceled', status: 'canceled', currentPeriodEnd: isoInDays(5) },
    });
    expect(actions(o)).toEqual(['change', 'current', 'change', 'change']);
  });

  it('checkout disabled: no buttons, current plan still marked', () => {
    expect(actions(overview({ checkoutEnabled: false }))).toEqual(['none', 'none', 'none', 'none']);
    expect(actions(paidOverview('menu', { checkoutEnabled: false }))).toEqual([
      'none',
      'current',
      'none',
      'none',
    ]);
  });

  it('comped orgs are not asked to pay', () => {
    const o = overview({ entitlements: { planKey: 'business', reason: 'comp', status: 'active' } });
    expect(actions(o)).toEqual(['none', 'none', 'none', 'current']);
  });
});

describe('settled checks', () => {
  it('checkout settles when the paid plan arrives', () => {
    expect(settledAfterCheckout('restaurant')(overview())).toBe(false);
    expect(settledAfterCheckout('restaurant')(paidOverview('restaurant'))).toBe(true);
  });

  it('change settles on the new plan, or on a scheduled cancel for Free', () => {
    expect(settledAfterChange('business')(paidOverview('restaurant'))).toBe(false);
    expect(settledAfterChange('business')(paidOverview('business'))).toBe(true);
    expect(settledAfterChange('free')(paidOverview('restaurant'))).toBe(false);
    const canceling = paidOverview('restaurant', {
      subscription: { scheduledChange: SCHEDULED_CANCEL },
    });
    expect(settledAfterChange('free')(canceling)).toBe(true);
    expect(settledAfterKeep(canceling)).toBe(false);
    expect(settledAfterKeep(paidOverview('restaurant'))).toBe(true);
  });
});

describe('nav locks', () => {
  it('locks cashier, kitchen and reports from the plan features', () => {
    const free = entitlements({ planKey: 'free', reason: 'trial_expired', features: [] });
    expect(isNavItemLocked('cashier', free)).toBe(true);
    expect(isNavItemLocked('kitchen', free)).toBe(true);
    expect(isNavItemLocked('today', free)).toBe(true);
    expect(isNavItemLocked('orders', free)).toBe(true);
    expect(isNavItemLocked('menu', free)).toBe(false);
    expect(isNavItemLocked('settings', free)).toBe(false);

    const restaurant = entitlements();
    expect(isNavItemLocked('cashier', restaurant)).toBe(false);
    expect(isNavItemLocked('kitchen', restaurant)).toBe(false);
    expect(isNavItemLocked('today', restaurant)).toBe(false);
  });

  it('locks nothing before entitlements load', () => {
    expect(isNavItemLocked('cashier', null)).toBe(false);
  });
});

describe('cheapestPlanWithFeature', () => {
  it('names the lowest plan that unlocks a feature', () => {
    expect(cheapestPlanWithFeature('menu.table_qr')).toBe('menu');
    expect(cheapestPlanWithFeature('pos.access')).toBe('restaurant');
    expect(cheapestPlanWithFeature('reports.export')).toBe('business');
    expect(cheapestPlanWithFeature('nope')).toBeNull();
  });
});
