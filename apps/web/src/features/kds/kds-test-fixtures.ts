import type { KitchenBoardOrder } from '@app/shared';

let n = 0;
function uuid(): string {
  n += 1;
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

export function boardOrder(overrides: Partial<KitchenBoardOrder> = {}): KitchenBoardOrder {
  return {
    id: uuid(),
    orderNumber: 1,
    type: 'takeaway',
    status: 'placed',
    version: 1,
    placedAt: '2026-10-11T12:00:00.000Z',
    tableLabel: null,
    customerName: null,
    notes: null,
    paymentStatus: 'unpaid',
    items: [],
    ...overrides,
  };
}

export function boardItem(
  overrides: Partial<KitchenBoardOrder['items'][number]> = {},
): KitchenBoardOrder['items'][number] {
  return {
    id: uuid(),
    name: { en: 'Burger', ar: 'برجر' },
    quantity: 1,
    notes: null,
    status: 'pending',
    isAddition: false,
    createdAt: '2026-10-11T12:00:00.000Z',
    voidedAt: null,
    voidReason: null,
    modifiers: [],
    ...overrides,
  };
}

export const BRANCH_ID = '00000000-0000-4000-8000-0000000000b1';
