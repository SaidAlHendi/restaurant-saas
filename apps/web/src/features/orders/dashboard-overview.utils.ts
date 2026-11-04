export type DeltaTrend = 'up' | 'down' | 'flat';

export type Delta = { label: string; trend: DeltaTrend };

/** Change against the previous day as "+12%". No delta when there is nothing to compare with. */
export function percentDelta(current: number, previous: number | null | undefined): Delta | null {
  if (previous === null || previous === undefined || previous <= 0) {
    return null;
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) {
    return { label: '0%', trend: 'flat' };
  }
  return { label: `${pct > 0 ? '+' : '-'}${String(Math.abs(pct))}%`, trend: pct > 0 ? 'up' : 'down' };
}

export type LiveCounts = { open: number; waiting: number; ready: number };

/** Counts for the live operations panel from the active (not finished) orders. */
export function liveCounts(orders: { status: string }[]): LiveCounts {
  let waiting = 0;
  let ready = 0;
  for (const order of orders) {
    if (order.status === 'placed') {
      waiting += 1;
    } else if (order.status === 'ready') {
      ready += 1;
    }
  }
  const open = orders.filter((order) =>
    ['placed', 'preparing', 'ready'].includes(order.status),
  ).length;
  return { open, waiting, ready };
}

/** Whole minutes since the oldest open order was created; null when nothing is open. */
export function oldestOpenMinutes(
  orders: { status: string; createdAt: string }[],
  now: Date,
): number | null {
  let oldest: number | null = null;
  for (const order of orders) {
    if (!['placed', 'preparing', 'ready'].includes(order.status)) {
      continue;
    }
    const created = Date.parse(order.createdAt);
    if (!Number.isNaN(created) && (oldest === null || created < oldest)) {
      oldest = created;
    }
  }
  return oldest === null ? null : Math.max(0, Math.floor((now.getTime() - oldest) / 60_000));
}
