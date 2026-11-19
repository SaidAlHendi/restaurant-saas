import { describe, expect, it } from 'vitest';

import type { OrderStatus } from '@app/shared';

import {
  canShowCancelOrder,
  canShowHandover,
  canShowPay,
  canShowReopen,
  reopenReasonValue,
  handoverLabelKey,
  canVoidOrderItem,
  nextOrderStatusTarget,
  posDetailActionLayout,
  dashboardActionLayout,
  hasAnyDashboardAction,
} from './pos-order-detail.utils.js';

const baseOrder = {
  status: 'ready' as const,
  paymentStatus: 'unpaid' as const,
  dueMinor: 500,
  payments: [],
};

describe('pos order detail actions', () => {
  it('offers the handover tap on a ready order even when unpaid (it opens payment first)', () => {
    expect(nextOrderStatusTarget(baseOrder)).toBe('completed');
    expect(canShowHandover(baseOrder)).toBe(true);
    expect(canShowPay(baseOrder)).toBe(true);
  });

  it('labels the handover by order type', () => {
    expect(handoverLabelKey('takeaway')).toBe('pos.handover.pickedUp');
    expect(handoverLabelKey('dine_in')).toBe('pos.handover.served');
  });

  it('shows no handover tap before ready or after completion', () => {
    expect(canShowHandover({ status: 'preparing' })).toBe(false);
    expect(canShowHandover({ status: 'completed' })).toBe(false);
  });

  it('allows Complete when ready and paid', () => {
    expect(
      nextOrderStatusTarget({ ...baseOrder, paymentStatus: 'paid', dueMinor: 0 }),
    ).toBe('completed');
  });

  it('Cancel on placed/preparing/ready without orders.cancel for cashiers', () => {
    expect(canShowCancelOrder(false, true, 'placed')).toBe(true);
    expect(canShowCancelOrder(false, true, 'preparing')).toBe(true);
    expect(canShowCancelOrder(false, true, 'ready')).toBe(true);
    expect(canShowCancelOrder(true, true, 'placed')).toBe(true);
    expect(canShowCancelOrder(true, true, 'completed')).toBe(false);
  });

  it('allows draft cancel with orders.create only', () => {
    expect(canShowCancelOrder(false, true, 'draft')).toBe(true);
    expect(canShowCancelOrder(false, false, 'draft')).toBe(false);
  });

  it('does not offer kitchen status for draft', () => {
    expect(
      nextOrderStatusTarget({
        status: 'draft',
        paymentStatus: 'unpaid',
        dueMinor: 100,
      }),
    ).toBeNull();
  });

  it('Void when placed/preparing/ready with no payments', () => {
    expect(canVoidOrderItem({ status: 'placed', payments: [] }, false)).toBe(true);
    expect(canVoidOrderItem({ status: 'preparing', payments: [] }, false)).toBe(true);
    expect(canVoidOrderItem({ status: 'ready', payments: [] }, false)).toBe(true);
    expect(
      canVoidOrderItem(
        {
          status: 'placed',
          payments: [
            {
              id: '01932a1a-7b3e-7000-8000-000000000080',
              method: 'cash',
              amountMinor: 100,
              tenderedMinor: 100,
              changeMinor: 0,
              displayTenderedMinor: null,
              displayChangeMinor: null,
              createdAt: '2026-04-01T10:00:00.000Z',
            },
          ],
        },
        false,
      ),
    ).toBe(false);
  });

  it('lets a held addition be voided even when the order has payments', () => {
    const paid = {
      status: 'placed' as const,
      payments: [
        {
          id: '01932a1a-7b3e-7000-8000-000000000080',
          method: 'cash' as const,
          amountMinor: 100,
          tenderedMinor: 100,
          changeMinor: 0,
          displayTenderedMinor: null,
          displayChangeMinor: null,
          createdAt: '2026-04-01T10:00:00.000Z',
        },
      ],
    };
    expect(canVoidOrderItem(paid, false, true)).toBe(true);
    expect(canVoidOrderItem(paid, false, false)).toBe(false);
  });
});

describe('reopen action', () => {
  it('shows only for completed orders and people with orders.reopen', () => {
    expect(canShowReopen(true, 'completed')).toBe(true);
    expect(canShowReopen(false, 'completed')).toBe(false);
    for (const status of ['draft', 'placed', 'preparing', 'ready', 'cancelled'] as const) {
      expect(canShowReopen(true, status)).toBe(false);
    }
  });

  it('treats a blank reason as none and caps it at 200 characters', () => {
    expect(reopenReasonValue('   ')).toBeUndefined();
    expect(reopenReasonValue(' wrong tap ')).toBe('wrong tap');
    expect(reopenReasonValue('x'.repeat(300))).toHaveLength(200);
  });
});

describe('posDetailActionLayout', () => {
  const base = { canAddItems: false, canCancel: false, canReopen: false };
  const order = (status: OrderStatus, dueMinor = 0) => ({
    status,
    paymentStatus: dueMinor > 0 ? ('unpaid' as const) : ('paid' as const),
    dueMinor,
  });

  it('draft: Pay is the primary action only while something is due', () => {
    expect(posDetailActionLayout({ ...base, order: order('draft', 500) }).primary).toBe('pay');
    expect(posDetailActionLayout({ ...base, order: order('draft', 0) }).primary).toBeNull();
  });

  it('placed: start preparing is primary, mark ready and pay are secondary', () => {
    const layout = posDetailActionLayout({ ...base, canAddItems: true, order: order('placed', 500) });
    expect(layout.primary).toBe('startPreparing');
    expect(layout.secondary).toEqual(['markReady', 'pay', 'addItems']);
  });

  it('preparing: mark ready is primary', () => {
    expect(posDetailActionLayout({ ...base, order: order('preparing') }).primary).toBe('markReady');
  });

  it('ready: hand over is primary and pay stays secondary while due', () => {
    const layout = posDetailActionLayout({ ...base, order: order('ready', 300) });
    expect(layout.primary).toBe('handover');
    expect(layout.secondary).toEqual(['pay']);
  });

  it('completed and cancelled have no primary action and no pay', () => {
    for (const status of ['completed', 'cancelled'] as const) {
      const layout = posDetailActionLayout({ ...base, order: order(status, 500) });
      expect(layout.primary).toBeNull();
      expect(layout.secondary).toEqual([]);
    }
  });

  it('reopen sits in the manager section, only when allowed (the caller passes canShowReopen)', () => {
    expect(posDetailActionLayout({ ...base, canReopen: true, order: order('completed') }).manager).toEqual(['reopen']);
    expect(posDetailActionLayout({ ...base, order: order('completed') }).manager).toEqual([]);
  });

  it('cancel is destructive and follows canCancel; print is always in More', () => {
    const layout = posDetailActionLayout({ ...base, canCancel: true, order: order('placed') });
    expect(layout.destructive).toEqual(['cancel']);
    expect(layout.more).toEqual(['printReceipt', 'printKitchen']);
    expect(posDetailActionLayout({ ...base, order: order('placed') }).destructive).toEqual([]);
  });
});

describe('dashboardActionLayout', () => {
  const placed = {
    status: 'placed' as const,
    paymentStatus: 'unpaid' as const,
    dueMinor: 500,
  };
  const full = posDetailActionLayout({ order: placed, canAddItems: true, canCancel: true, canReopen: false });

  it('drops Add items and keeps everything else for a user with all permissions', () => {
    const layout = dashboardActionLayout(full, { create: true, updateStatus: true });
    expect(layout.primary).toBe('startPreparing');
    expect(layout.secondary).toEqual(['markReady', 'pay']);
    expect(layout.destructive).toEqual(['cancel']);
  });

  it('hides status buttons without orders.update_status and pay/print without orders.create', () => {
    const layout = dashboardActionLayout(full, { create: false, updateStatus: false });
    expect(layout.primary).toBeNull();
    expect(layout.secondary).toEqual([]);
    expect(layout.more).toEqual([]);
    expect(layout.destructive).toEqual(['cancel']);
  });

  it('a read-only user has nothing to show', () => {
    const readOnly = posDetailActionLayout({ order: placed, canAddItems: false, canCancel: false, canReopen: false });
    expect(hasAnyDashboardAction(dashboardActionLayout(readOnly, { create: false, updateStatus: false }))).toBe(false);
  });
});
