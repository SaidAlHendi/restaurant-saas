import { describe, expect, it } from 'vitest';

import type { KitchenBoardResponse, OrderRealtimeClientPayload } from '@app/shared';

import { shouldChime, shouldRefetchForEvent } from './kds-board.utils.js';

const branchId = '00000000-0000-4000-8000-000000000001';

function payload(
  partial: Partial<OrderRealtimeClientPayload> & Pick<OrderRealtimeClientPayload, 'change'>,
): OrderRealtimeClientPayload {
  return {
    orderId: '00000000-0000-4000-8000-000000000010',
    branchId,
    status: 'placed',
    version: 2,
    change: partial.change,
    ...partial,
  };
}

const emptyBoard: KitchenBoardResponse = {
  serverTime: new Date().toISOString(),
  orders: [],
};

describe('shouldRefetchForEvent', () => {
  it('does not refetch for draft status on a new order', () => {
    expect(
      shouldRefetchForEvent(
        emptyBoard,
        payload({ status: 'draft', version: 1, change: 'status' }),
        branchId,
      ),
    ).toBe(false);
  });
});

describe('shouldChime', () => {
  it('does not chime for items_added on draft not on board', () => {
    expect(
      shouldChime(emptyBoard, payload({ status: 'draft', change: 'items_added', version: 2 })),
    ).toBe(false);
  });

  it('does not chime for cancelled draft not on board', () => {
    expect(
      shouldChime(emptyBoard, payload({ status: 'draft', change: 'cancelled', version: 2 })),
    ).toBe(false);
  });

  it('chimes for placed when status is a board status', () => {
    expect(shouldChime(emptyBoard, payload({ status: 'placed', change: 'placed', version: 1 }))).toBe(
      true,
    );
  });

  it('chimes for items_added when order is already on the board', () => {
    const board: KitchenBoardResponse = {
      serverTime: new Date().toISOString(),
      orders: [
        {
          id: '00000000-0000-4000-8000-000000000010',
          orderNumber: 1,
          status: 'placed',
          version: 1,
          type: 'takeaway',
          placedAt: new Date().toISOString(),
          tableLabel: null,
          customerName: null,
          notes: null,
          paymentStatus: 'unpaid',
          items: [],
        },
      ],
    };
    expect(
      shouldChime(board, payload({ status: 'placed', change: 'items_added', version: 2 })),
    ).toBe(true);
  });
});
