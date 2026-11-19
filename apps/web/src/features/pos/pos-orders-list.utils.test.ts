import { describe, expect, it } from 'vitest';

import {
  defaultTodayOnly,
  mergeListQueryWithSearch,
  parsePosOrdersTab,
  parseTodayOnly,
  POS_ORDERS_TABS,
  showOlderOrdersHint,
  tabToListQuery,
} from './pos-orders-list.utils.js';

describe('tabToListQuery', () => {
  it('maps active tab', () => {
    expect(tabToListQuery('active', 20)).toEqual({ limit: 20, activeOnly: true });
  });

  it('maps awaiting payment tab', () => {
    expect(tabToListQuery('awaitingPayment', 20)).toEqual({
      limit: 20,
      status: 'draft',
      todayOnly: true,
    });
  });
});

describe('parsePosOrdersTab', () => {
  it('defaults to active', () => {
    expect(parsePosOrdersTab(null)).toBe('active');
  });
});

describe('mergeListQueryWithSearch', () => {
  it('adds trimmed q', () => {
    expect(mergeListQueryWithSearch({ limit: 10, activeOnly: true }, '  42 ')).toEqual({
      limit: 10,
      activeOnly: true,
      q: '42',
    });
  });
});

describe('today-only switch', () => {
  it('defaults: open-order tabs show everything, daily lists show today', () => {
    expect(defaultTodayOnly('active')).toBe(false);
    expect(defaultTodayOnly('ready')).toBe(false);
    for (const tab of ['awaitingPayment', 'completed', 'cancelled', 'allToday'] as const) {
      expect(defaultTodayOnly(tab)).toBe(true);
    }
  });

  it('the URL choice wins over the tab default', () => {
    expect(parseTodayOnly(null, 'ready')).toBe(false);
    expect(parseTodayOnly('1', 'ready')).toBe(true);
    expect(parseTodayOnly('0', 'completed')).toBe(false);
    expect(parseTodayOnly('nonsense', 'completed')).toBe(true);
  });

  it('builds the list query for every tab and switch value', () => {
    expect(tabToListQuery('active', 20)).toEqual({ limit: 20, activeOnly: true });
    expect(tabToListQuery('active', 20, true)).toEqual({
      limit: 20,
      activeOnly: true,
      todayOnly: true,
    });
    expect(tabToListQuery('ready', 20)).toEqual({ limit: 20, status: 'ready' });
    expect(tabToListQuery('ready', 20, true)).toEqual({
      limit: 20,
      status: 'ready',
      todayOnly: true,
    });
    expect(tabToListQuery('completed', 20)).toEqual({
      limit: 20,
      status: 'completed',
      todayOnly: true,
    });
    expect(tabToListQuery('completed', 20, false)).toEqual({ limit: 20, status: 'completed' });
    expect(tabToListQuery('allToday', 20)).toEqual({ limit: 20, todayOnly: true });
    expect(tabToListQuery('allToday', 20, false)).toEqual({ limit: 20 });
    for (const tab of POS_ORDERS_TABS) {
      expect(tabToListQuery(tab, 20, false)).not.toHaveProperty('todayOnly');
    }
  });

  it('shows the older-orders hint only on open-order tabs, with the switch on and something hidden', () => {
    expect(showOlderOrdersHint('ready', true, 2)).toBe(true);
    expect(showOlderOrdersHint('active', true, 1)).toBe(true);
    expect(showOlderOrdersHint('ready', false, 2)).toBe(false);
    expect(showOlderOrdersHint('ready', true, 0)).toBe(false);
    expect(showOlderOrdersHint('ready', true, undefined)).toBe(false);
    expect(showOlderOrdersHint('completed', true, 3)).toBe(false);
  });
});
