import { orderDetailSchema, type OrderItem } from '@app/shared';
import { describe, expect, it, beforeEach } from 'vitest';

import {
  kitchenItemsToPrint,
  loadPrintedKitchenItemIds,
  markKitchenItemsPrinted,
  savePrintedKitchenItemIds,
} from './kitchen-addition-diff.js';

const item = (overrides: Partial<OrderItem> & Pick<OrderItem, 'id'>): OrderItem => ({
  productId: '01932a1a-7b3e-7000-8000-000000000010',
  productNameSnapshot: { en: 'Tea' },
  unitPriceMinor: 100,
  quantity: 1,
  lineTotalMinor: 100,
  notes: null,
  status: 'pending',
  isAddition: false,
  voidedAt: null,
  voidReason: null,
  modifiers: [],
  ...overrides,
});

function baseOrder(items: OrderItem[]) {
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

describe('kitchenItemsToPrint', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('returns all active items for a full kitchen ticket', () => {
    const order = baseOrder([
      item({ id: '01932a1a-7b3e-7000-8000-000000000001' }),
      item({ id: '01932a1a-7b3e-7000-8000-000000000002', status: 'voided' }),
    ]);
    const result = kitchenItemsToPrint(order, { additionsOnly: false });
    expect(result.map((i) => i.id)).toEqual(['01932a1a-7b3e-7000-8000-000000000001']);
  });

  it('returns only unprinted additions when additionsOnly', () => {
    const order = baseOrder([
      item({ id: '01932a1a-7b3e-7000-8000-000000000003' }),
      item({ id: '01932a1a-7b3e-7000-8000-000000000004', isAddition: true }),
      item({ id: '01932a1a-7b3e-7000-8000-000000000005', isAddition: true }),
    ]);
    savePrintedKitchenItemIds(order.id, ['01932a1a-7b3e-7000-8000-000000000004']);
    const result = kitchenItemsToPrint(order, { additionsOnly: true });
    expect(result.map((i) => i.id)).toEqual(['01932a1a-7b3e-7000-8000-000000000005']);
  });

  it('markKitchenItemsPrinted merges ids', () => {
    const order = baseOrder([
      item({ id: '01932a1a-7b3e-7000-8000-000000000006' }),
      item({ id: '01932a1a-7b3e-7000-8000-000000000007', isAddition: true }),
    ]);
    markKitchenItemsPrinted(order, [
      item({ id: '01932a1a-7b3e-7000-8000-000000000007', isAddition: true }),
    ]);
    expect(loadPrintedKitchenItemIds(order.id).has('01932a1a-7b3e-7000-8000-000000000007')).toBe(
      true,
    );
    expect(loadPrintedKitchenItemIds(order.id).has('01932a1a-7b3e-7000-8000-000000000006')).toBe(
      true,
    );
  });
});
