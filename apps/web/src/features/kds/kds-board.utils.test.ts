import { describe, expect, it } from 'vitest';

import {
  ageLevelFor,
  formatAge,
  nextKitchenStatus,
  orderAgeMs,
  serverClockOffsetMs,
  shouldChime,
  shouldRefetchForEvent,
  splitBoardColumns,
  withItemReady,
  withServerOrder,
} from './kds-board.utils.js';
import { DEFAULT_KDS_SETTINGS } from './kds-settings.utils.js';
import { BRANCH_ID, boardItem, boardOrder } from './kds-test-fixtures.js';

const MIN = 60_000;

describe('splitBoardColumns', () => {
  it('splits by status and sorts oldest first', () => {
    const late = boardOrder({ placedAt: '2026-10-11T12:05:00.000Z', orderNumber: 2 });
    const early = boardOrder({ placedAt: '2026-10-11T12:00:00.000Z', orderNumber: 1 });
    const cooking = boardOrder({ status: 'preparing' });
    const done = boardOrder({ status: 'ready' });
    const cols = splitBoardColumns([late, cooking, early, done]);
    expect(cols.placed.map((o) => o.orderNumber)).toEqual([1, 2]);
    expect(cols.preparing).toEqual([cooking]);
    expect(cols.ready).toEqual([done]);
  });
});

describe('age timer', () => {
  const placedAt = '2026-10-11T12:00:00.000Z';
  const placedMs = Date.parse(placedAt);

  it('turns amber at exactly 10:00 and red at 20:00', () => {
    const at = (ms: number) =>
      ageLevelFor(orderAgeMs(placedAt, placedMs + ms, 0), DEFAULT_KDS_SETTINGS);
    expect(at(10 * MIN - 1_000)).toBe('normal');
    expect(at(10 * MIN)).toBe('amber');
    expect(at(20 * MIN - 1_000)).toBe('amber');
    expect(at(20 * MIN)).toBe('red');
  });

  it('corrects a fast tablet clock with the server offset', () => {
    // Tablet is 3 minutes ahead of the server.
    const receivedAt = Date.parse('2026-10-11T12:13:00.000Z');
    const offset = serverClockOffsetMs('2026-10-11T12:10:00.000Z', receivedAt);
    expect(offset).toBe(-3 * MIN);
    const age = orderAgeMs(placedAt, receivedAt, offset);
    expect(age).toBe(10 * MIN);
    expect(ageLevelFor(age, DEFAULT_KDS_SETTINGS)).toBe('amber');
  });

  it('never goes negative and formats m:ss / h:mm:ss', () => {
    expect(orderAgeMs(placedAt, placedMs - 5_000, 0)).toBe(0);
    expect(formatAge(65_000)).toBe('1:05');
    expect(formatAge(3_725_000)).toBe('1:02:05');
  });
});

describe('nextKitchenStatus', () => {
  it('moves placed -> preparing -> ready and stops at ready', () => {
    expect(nextKitchenStatus('placed')).toBe('preparing');
    expect(nextKitchenStatus('preparing')).toBe('ready');
    expect(nextKitchenStatus('ready')).toBeNull();
  });
});

describe('shouldRefetchForEvent', () => {
  const card = boardOrder({ version: 3 });
  const board = { serverTime: '2026-10-11T12:00:00.000Z', orders: [card] };
  const event = (
    over: Partial<{
      orderId: string;
      version: number;
      status: 'placed' | 'completed';
      branchId: string;
    }>,
  ) => ({
    orderId: card.id,
    branchId: BRANCH_ID,
    status: 'placed' as const,
    version: 3,
    ...over,
  });

  it('refetches for a newer version and ignores same or older', () => {
    expect(shouldRefetchForEvent(board, event({ version: 4 }), BRANCH_ID)).toBe(true);
    expect(shouldRefetchForEvent(board, event({ version: 3 }), BRANCH_ID)).toBe(false);
    expect(shouldRefetchForEvent(board, event({ version: 2 }), BRANCH_ID)).toBe(false);
  });

  it('refetches for an unknown active order, not for an unknown finished one', () => {
    const other = '00000000-0000-4000-8000-0000000000ff';
    expect(shouldRefetchForEvent(board, event({ orderId: other }), BRANCH_ID)).toBe(true);
    expect(
      shouldRefetchForEvent(board, event({ orderId: other, status: 'completed' }), BRANCH_ID),
    ).toBe(false);
  });

  it('ignores another branch', () => {
    expect(
      shouldRefetchForEvent(
        board,
        event({ version: 9, branchId: '00000000-0000-4000-8000-0000000000b2' }),
        BRANCH_ID,
      ),
    ).toBe(false);
  });
});

describe('shouldChime', () => {
  const base = { orderId: BRANCH_ID, branchId: BRANCH_ID, status: 'placed' as const, version: 1 };

  it('chimes for changes the kitchen did not make', () => {
    for (const change of ['placed', 'items_added', 'item_voided', 'cancelled'] as const) {
      expect(shouldChime({ ...base, change })).toBe(true);
    }
  });

  it('stays quiet for status, item status, payments and old events without change', () => {
    for (const change of ['status', 'item_status', 'payment'] as const) {
      expect(shouldChime({ ...base, change })).toBe(false);
    }
    expect(shouldChime(base)).toBe(false);
  });
});

describe('board patches', () => {
  it('un-marking an item follows the order status (optimistic)', () => {
    const item = boardItem({ status: 'ready' });
    const placed = boardOrder({ items: [item] });
    const cooking = boardOrder({
      status: 'preparing',
      items: [{ ...item, id: `${item.id.slice(0, -1)}9` }],
    });
    const board = { serverTime: '', orders: [placed, cooking] };
    expect(withItemReady(board, placed.id, item.id, false).orders[0]?.items[0]?.status).toBe(
      'pending',
    );
    const cookingItem = cooking.items[0];
    expect(cookingItem).toBeDefined();
    expect(
      withItemReady(board, cooking.id, cookingItem?.id ?? '', false).orders[1]?.items[0]?.status,
    ).toBe('preparing');
  });

  it('applies a newer server order and drops orders that left the board', () => {
    const order = boardOrder({ version: 2 });
    const board = { serverTime: '', orders: [order] };
    const moved = withServerOrder(board, {
      id: order.id,
      status: 'preparing',
      version: 3,
      items: [],
    });
    expect(moved.orders[0]).toMatchObject({ status: 'preparing', version: 3 });
    const stale = withServerOrder(moved, { id: order.id, status: 'placed', version: 2, items: [] });
    expect(stale.orders[0]?.version).toBe(3);
    const gone = withServerOrder(moved, {
      id: order.id,
      status: 'completed',
      version: 4,
      items: [],
    });
    expect(gone.orders).toHaveLength(0);
  });
});
