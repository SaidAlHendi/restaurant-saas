import { orderDetailSchema, type OrderItem } from '@app/shared';
import { describe, expect, it } from 'vitest';

import { newlyAddedItems, releasedAdditions } from './kitchen-addition-diff.js';

const item = (overrides: Partial<OrderItem> & Pick<OrderItem, 'id'>): OrderItem => ({
  productId: '01932a1a-7b3e-7000-8000-000000000010',
  productNameSnapshot: { en: 'Tea' },
  unitPriceMinor: 100,
  quantity: 1,
  lineTotalMinor: 100,
  notes: null,
  status: 'pending',
  isAddition: false,
  seat: null,
  voidedAt: null,
  voidReason: null,
  modifiers: [],
  ...overrides,
});

function order(items: OrderItem[]) {
  return orderDetailSchema.parse({
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
    pagerNumber: null,
    notes: null,
    version: 1,
    placedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    items,
    payments: [],
  });
}

const id = (n: number) => `01932a1a-7b3e-7000-8000-0000000001${String(n).padStart(2, '0')}`;

describe('newlyAddedItems', () => {
  it('returns only items that were not in the order before', () => {
    const before = order([item({ id: id(1) })]);
    const after = order([item({ id: id(1) }), item({ id: id(2), isAddition: true })]);
    expect(newlyAddedItems(before, after).map((i) => i.id)).toEqual([id(2)]);
  });

  it('ignores voided new items and returns nothing when nothing changed', () => {
    const before = order([item({ id: id(1) })]);
    const after = order([item({ id: id(1) }), item({ id: id(2), status: 'voided' })]);
    expect(newlyAddedItems(before, after)).toEqual([]);
  });
});

describe('releasedAdditions', () => {
  it('returns held items that left awaiting_payment', () => {
    const before = order([item({ id: id(1) }), item({ id: id(2), status: 'awaiting_payment' })]);
    const after = order([item({ id: id(1) }), item({ id: id(2), status: 'pending' })]);
    expect(releasedAdditions(before, after).map((i) => i.id)).toEqual([id(2)]);
  });

  it('returns nothing while the items are still held or were voided', () => {
    const before = order([item({ id: id(2), status: 'awaiting_payment' })]);
    expect(
      releasedAdditions(before, order([item({ id: id(2), status: 'awaiting_payment' })])),
    ).toEqual([]);
    expect(releasedAdditions(before, order([item({ id: id(2), status: 'voided' })]))).toEqual([]);
  });
});
