import type { OrderStatus } from '@app/shared';

import type { OrderListQueryInput } from '../orders/orders.api.js';

export type PosOrdersTab =
  | 'active'
  | 'awaitingPayment'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'allToday';

export const POS_ORDERS_TABS: PosOrdersTab[] = [
  'active',
  'awaitingPayment',
  'ready',
  'completed',
  'cancelled',
  'allToday',
];

export function parsePosOrdersTab(value: string | null): PosOrdersTab {
  if (value !== null && (POS_ORDERS_TABS as string[]).includes(value)) {
    return value as PosOrdersTab;
  }
  return 'active';
}

export function tabToListQuery(tab: PosOrdersTab, limit: number): OrderListQueryInput {
  const base: OrderListQueryInput = { limit };
  switch (tab) {
    case 'active':
      return { ...base, activeOnly: true };
    case 'awaitingPayment':
      return { ...base, status: 'draft', todayOnly: true };
    case 'ready':
      return { ...base, status: 'ready', todayOnly: true };
    case 'completed':
      return { ...base, status: 'completed', todayOnly: true };
    case 'cancelled':
      return { ...base, status: 'cancelled', todayOnly: true };
    case 'allToday':
      return { ...base, todayOnly: true };
    default:
      return { ...base, activeOnly: true };
  }
}

export function mergeListQueryWithSearch(
  query: OrderListQueryInput,
  q: string | undefined,
): OrderListQueryInput {
  const trimmed = q?.trim();
  if (trimmed === undefined || trimmed.length === 0) {
    return query;
  }
  return { ...query, q: trimmed };
}

export function orderTypeTableLabel(input: {
  type: 'dine_in' | 'takeaway';
  tableLabel: string | null;
  customerName: string | null;
  takeawayLabel: string;
}): string {
  if (input.type === 'dine_in') {
    return input.tableLabel ?? input.takeawayLabel;
  }
  return input.customerName ?? input.takeawayLabel;
}

export function isDraftStatus(status: OrderStatus): boolean {
  return status === 'draft';
}
