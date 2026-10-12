import { describe, expect, it } from 'vitest';

import {
  addCalendarDays,
  dashboardOrdersFiltersToSearchParams,
  parseDashboardOrdersFilters,
  periodToDateRange,
} from './dashboard-orders-filters.utils.js';

describe('parseDashboardOrdersFilters', () => {
  const ref = '2026-03-15';

  it('falls back invalid status/type/payment to all', () => {
    const params = new URLSearchParams({
      status: 'not-a-status',
      type: 'delivery',
      pay: 'bitcoin',
      period: 'nope',
    });
    const filters = parseDashboardOrdersFilters(params, ref);
    expect(filters.status).toBe('all');
    expect(filters.type).toBe('all');
    expect(filters.paymentMethod).toBe('all');
    expect(filters.period).toBe('today');
  });

  it('falls back custom period with invalid dates to today', () => {
    const params = new URLSearchParams({
      period: 'custom',
      from: '2026-02-30',
      to: '2026-03-01',
    });
    const filters = parseDashboardOrdersFilters(params, ref);
    expect(filters.period).toBe('today');
    expect(filters.dateFrom).toBe(ref);
    expect(filters.dateTo).toBe(ref);
  });

  it('falls back custom period when range exceeds 92 days', () => {
    const params = new URLSearchParams({
      period: 'custom',
      from: '2026-01-01',
      to: '2026-06-01',
    });
    const filters = parseDashboardOrdersFilters(params, ref);
    expect(filters.period).toBe('today');
  });

  it('keeps valid custom period', () => {
    const params = new URLSearchParams({
      period: 'custom',
      from: '2026-03-01',
      to: '2026-03-10',
    });
    const filters = parseDashboardOrdersFilters(params, ref);
    expect(filters.period).toBe('custom');
    expect(filters.dateFrom).toBe('2026-03-01');
    expect(filters.dateTo).toBe('2026-03-10');
  });

  it('round-trips URL params', () => {
    const initial = parseDashboardOrdersFilters(
      new URLSearchParams('period=last7&status=placed'),
      ref,
    );
    const back = dashboardOrdersFiltersToSearchParams(initial);
    const again = parseDashboardOrdersFilters(back, ref);
    expect(again.period).toBe('last7');
    expect(again.status).toBe('placed');
    expect(again.dateFrom).toBe('2026-03-09');
    expect(again.dateTo).toBe(ref);
  });
});

describe('periodToDateRange', () => {
  const ref = '2026-03-31';

  it('maps today and yesterday', () => {
    expect(periodToDateRange('today', ref)).toEqual({ dateFrom: ref, dateTo: ref });
    expect(periodToDateRange('yesterday', ref)).toEqual({
      dateFrom: '2026-03-30',
      dateTo: '2026-03-30',
    });
  });

  it('maps last7 and last30', () => {
    expect(periodToDateRange('last7', ref)).toEqual({
      dateFrom: '2026-03-25',
      dateTo: ref,
    });
    expect(periodToDateRange('last30', ref)).toEqual({
      dateFrom: '2026-03-02',
      dateTo: ref,
    });
  });

  it('uses custom from/to across month end', () => {
    expect(
      periodToDateRange('custom', ref, '2026-03-28', '2026-04-02'),
    ).toEqual({ dateFrom: '2026-03-28', dateTo: '2026-04-02' });
  });
});

describe('addCalendarDays', () => {
  it('steps across month boundaries', () => {
    expect(addCalendarDays('2026-01-31', 1)).toBe('2026-02-01');
  });
});
