import type { Bill, BillItem } from '@app/shared';

export const NO_SEAT = '';

export function itemDueMinor(item: Pick<BillItem, 'shareMinor' | 'paidMinor' | 'voided'>): number {
  return item.voided ? 0 : Math.max(0, item.shareMinor - item.paidMinor);
}

/** Every item that still owes money, with its round number, in bill order. */
export function dueItems(bill: Bill): (BillItem & { round: number; orderNumber: number })[] {
  return bill.orders.flatMap((order) =>
    order.items
      .filter((item) => itemDueMinor(item) > 0)
      .map((item) => ({ ...item, round: order.round, orderNumber: order.orderNumber })),
  );
}

/** Guest labels that still owe something, plus whether unlabelled items owe too. */
export function seatSummaries(bill: Bill): { seat: string; dueMinor: number; itemIds: string[] }[] {
  const map = new Map<string, { seat: string; dueMinor: number; itemIds: string[] }>();
  for (const item of dueItems(bill)) {
    const seat = item.seat ?? NO_SEAT;
    const entry = map.get(seat) ?? { seat, dueMinor: 0, itemIds: [] };
    entry.dueMinor += itemDueMinor(item);
    entry.itemIds.push(item.id);
    map.set(seat, entry);
  }
  return [...map.values()].sort((a, b) =>
    a.seat.localeCompare(b.seat, undefined, { numeric: true }),
  );
}

export function selectedDueMinor(bill: Bill, selected: ReadonlySet<string>): number {
  return dueItems(bill)
    .filter((item) => selected.has(item.id))
    .reduce((sum, item) => sum + itemDueMinor(item), 0);
}

/** Next statuses to walk an order through until it is completed. */
export function statusesToComplete(status: string): ('preparing' | 'ready' | 'completed')[] {
  const chain = ['placed', 'preparing', 'ready', 'completed'] as const;
  const index = chain.indexOf(status as (typeof chain)[number]);
  if (index < 0) return [];
  return chain.slice(index + 1) as ('preparing' | 'ready' | 'completed')[];
}

export interface TableCardInfo {
  /** Open bills of the table; empty means the table is free. */
  bills: Bill[];
  dueMinor: number;
  rounds: number;
  pagers: number[];
}

/** What a table card shows: due amount, rounds and pager numbers over the table's open bills. */
export function tableCardInfo(openBills: Bill[], tableId: string): TableCardInfo {
  const bills = openBills.filter((b) => b.tableId === tableId);
  const live = bills.flatMap((b) => b.orders.filter((o) => o.status !== 'cancelled'));
  const pagers = [
    ...new Set(live.flatMap((o) => (o.pagerNumber === null ? [] : [o.pagerNumber]))),
  ].sort((a, b) => a - b);
  return {
    bills,
    dueMinor: bills.reduce((sum, b) => sum + b.dueMinor, 0),
    rounds: live.length,
    pagers,
  };
}

/** Orders that can still move to another table: live and without any payment. */
export function movableOrders(bill: Bill): Bill['orders'] {
  return bill.orders.filter(
    (o) => o.status !== 'cancelled' && o.status !== 'refunded' && o.paidMinor === 0,
  );
}
