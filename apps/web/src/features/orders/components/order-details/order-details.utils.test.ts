import { describe, expect, it } from 'vitest';

import {
  detailStatusVariant,
  exchangeRateLabel,
  groupItemsBySeat,
  orderStepper,
  relativeTimeLabel,
} from './order-details.utils.js';

describe('orderStepper', () => {
  it('marks earlier steps done and the current one', () => {
    const s = orderStepper('preparing');
    expect(s.mode).toBe('flow');
    expect(s.steps.map((x) => x.state)).toEqual(['done', 'current', 'upcoming', 'upcoming']);
  });
  it('completed is all done', () => {
    expect(orderStepper('completed').steps.every((x) => x.state === 'done')).toBe(true);
  });
  it('draft and cancelled are not on the flow', () => {
    expect(orderStepper('draft').mode).toBe('draft');
    expect(orderStepper('cancelled').mode).toBe('cancelled');
    expect(orderStepper('cancelled').steps.every((x) => x.state === 'upcoming')).toBe(true);
  });
});

describe('groupItemsBySeat', () => {
  it('stays flat without seats', () => {
    const groups = groupItemsBySeat([{ seat: null }, { seat: null }]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.seat).toBeNull();
  });
  it('groups by seat in first-seen order, unseated last', () => {
    const groups = groupItemsBySeat([
      { id: 1, seat: '2' },
      { id: 2, seat: null },
      { id: 3, seat: '1' },
      { id: 4, seat: '2' },
    ]);
    expect(groups.map((g) => g.seat)).toEqual(['2', '1', null]);
    expect(groups[0]?.items).toHaveLength(2);
    expect(groups[2]?.key).toBe('unseated');
  });
  it('returns nothing for no items', () => {
    expect(groupItemsBySeat([])).toEqual([]);
  });
});

describe('exchangeRateLabel', () => {
  const display = { currency: 'SYP', rate: 13000, itemStep: 100, totalStep: 500 };
  it('shows the frozen rate', () => {
    expect(exchangeRateLabel('USD', display, 'en-US')).toBe('1 USD = 13,000 SYP');
  });
  it('is null without a display currency or when it equals the base', () => {
    expect(exchangeRateLabel('USD', null, 'en-US')).toBeNull();
    expect(exchangeRateLabel('SYP', display, 'en-US')).toBeNull();
  });
});

describe('detailStatusVariant', () => {
  it('maps each status to a distinct tone', () => {
    expect(detailStatusVariant('draft')).toBe('outline');
    expect(detailStatusVariant('placed')).toBe('new');
    expect(detailStatusVariant('preparing')).toBe('preparing');
    expect(detailStatusVariant('ready')).toBe('ready');
    expect(detailStatusVariant('cancelled')).toBe('cancelled');
  });
});

describe('relativeTimeLabel', () => {
  const now = new Date('2026-03-01T12:00:00.000Z');
  it('speaks in minutes, hours and days', () => {
    expect(relativeTimeLabel('2026-03-01T11:55:00.000Z', now, 'en-US')).toBe('5 minutes ago');
    expect(relativeTimeLabel('2026-03-01T09:00:00.000Z', now, 'en-US')).toBe('3 hours ago');
    expect(relativeTimeLabel('2026-02-27T12:00:00.000Z', now, 'en-US')).toBe('2 days ago');
  });
});
