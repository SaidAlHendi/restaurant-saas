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

/** Open-order tabs (Active, Awaiting payment, Ready) show everything by default; the lists that grow every day default to today. */
export function defaultTodayOnly(tab: PosOrdersTab): boolean {
  return tab !== 'active' && tab !== 'ready' && tab !== 'awaitingPayment';
}

/** `?today=1|0` wins; otherwise the tab's default. */
export function parseTodayOnly(value: string | null, tab: PosOrdersTab): boolean {
  if (value === '1') {
    return true;
  }
  if (value === '0') {
    return false;
  }
  return defaultTodayOnly(tab);
}

export function tabToListQuery(
  tab: PosOrdersTab,
  pageSize: number,
  todayOnly: boolean = defaultTodayOnly(tab),
): OrderListQueryInput {
  const base: OrderListQueryInput = { pageSize, ...(todayOnly ? { todayOnly: true } : {}) };
  switch (tab) {
    case 'active':
      return { ...base, activeOnly: true };
    case 'awaitingPayment':
      return { ...base, status: 'draft' };
    case 'ready':
      return { ...base, status: 'ready' };
    case 'completed':
      return { ...base, status: 'completed' };
    case 'cancelled':
      return { ...base, status: 'cancelled' };
    case 'allToday':
      return base;
    default:
      return { ...base, activeOnly: true };
  }
}

/** "N older orders hidden": only for open-order tabs, with the switch on, when the API says some are hidden. */
export function showOlderOrdersHint(
  tab: PosOrdersTab,
  todayOnly: boolean,
  hiddenOlderCount: number | undefined,
): boolean {
  return (
    (tab === 'active' || tab === 'ready' || tab === 'awaitingPayment') &&
    todayOnly &&
    (hiddenOlderCount ?? 0) > 0
  );
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

export function isDraftStatus(status: OrderStatus): boolean {
  return status === 'draft';
}
