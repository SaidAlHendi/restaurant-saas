import { describe, expect, it } from 'vitest';

import { mergeListQueryWithSearch, parsePosOrdersTab, tabToListQuery } from './pos-orders-list.utils.js';

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
