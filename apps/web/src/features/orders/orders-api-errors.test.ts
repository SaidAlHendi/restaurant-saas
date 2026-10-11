import { describe, expect, it } from 'vitest';

import { orderFromVersionConflict, ordersApiErrorMessage, parseOrdersApiErrorCode } from './orders-api-errors.js';

const t = (key: string) => key;

describe('parseOrdersApiErrorCode', () => {
  it('reads nested API error code from RTK fetch errors', () => {
    expect(
      parseOrdersApiErrorCode({
        status: 409,
        data: { error: { code: 'ORDER_VERSION_CONFLICT' } },
      }),
    ).toBe('ORDER_VERSION_CONFLICT');
  });
});

describe('orderFromVersionConflict', () => {
  it('parses order detail from conflict payload', () => {
    const order = {
      id: '01932a1a-7b3e-7000-8000-000000000099',
      orgId: '01932a1a-7b3e-7000-8000-000000000020',
      branchId: '01932a1a-7b3e-7000-8000-000000000030',
      clientOrderId: '01932a1a-7b3e-7000-8000-000000000091',
      orderNumber: 1,
      businessDate: '2026-01-01',
      type: 'takeaway',
      status: 'placed',
      paymentStatus: 'unpaid',
      subtotalMinor: 100,
      discountMinor: 0,
      taxMinor: 0,
      totalMinor: 100,
      currency: 'USD',
      paidMinor: 0,
      dueMinor: 100,
      tableId: null,
      customerName: null,
      notes: null,
      version: 2,
      placedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancelReason: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      items: [],
      payments: [],
    };
    const parsed = orderFromVersionConflict({
      status: 409,
      data: { error: { code: 'ORDER_VERSION_CONFLICT', details: { order } } },
    });
    expect(parsed?.version).toBe(2);
  });
});

describe('ordersApiErrorMessage', () => {
  it('maps version conflict key', () => {
    expect(ordersApiErrorMessage(t, 'ORDER_VERSION_CONFLICT')).toBe('orders.errors.versionConflict');
  });
});
