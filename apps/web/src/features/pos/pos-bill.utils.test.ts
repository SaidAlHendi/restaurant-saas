import { describe, expect, it } from 'vitest';
import type { Bill } from '@app/shared';

import { dueItems, seatSummaries, selectedDueMinor, statusesToComplete } from './pos-bill.utils.js';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const item = (n: number, seat: string | null, share: number, paid = 0, voided = false) => ({
  id: id(n),
  productNameSnapshot: { en: 'x' },
  quantity: 1,
  lineTotalMinor: share,
  shareMinor: share,
  paidMinor: paid,
  seat,
  status: 'pending' as const,
  voided,
});
const bill = {
  orders: [
    {
      id: id(100),
      orderNumber: 1,
      round: 1,
      items: [item(1, 'Guest 1', 500), item(2, 'Guest 2', 700, 700), item(3, null, 300)],
    },
    {
      id: id(101),
      orderNumber: 2,
      round: 2,
      items: [item(4, 'Guest 1', 200), item(5, 'Guest 2', 100, 0, true)],
    },
  ],
} as unknown as Bill;

describe('pos bill utils', () => {
  it('lists only items that still owe money', () => {
    expect(dueItems(bill).map((i) => i.id)).toEqual([id(1), id(3), id(4)]);
  });
  it('groups what is due per guest', () => {
    expect(seatSummaries(bill)).toEqual([
      { seat: '', dueMinor: 300, itemIds: [id(3)] },
      { seat: 'Guest 1', dueMinor: 700, itemIds: [id(1), id(4)] },
    ]);
  });
  it('adds up the selected items', () => {
    expect(selectedDueMinor(bill, new Set([id(1), id(4), id(2)]))).toBe(700);
  });
  it('walks an order to completed', () => {
    expect(statusesToComplete('placed')).toEqual(['preparing', 'ready', 'completed']);
    expect(statusesToComplete('ready')).toEqual(['completed']);
    expect(statusesToComplete('completed')).toEqual([]);
  });
});
