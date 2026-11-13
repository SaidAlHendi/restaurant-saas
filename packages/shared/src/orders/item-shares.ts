/**
 * Splits an order's total over its (non-voided) items so each item has an exact amount to pay.
 * Tax and discount are spread in proportion to the line totals; the leftover minor units go to the
 * lines with the largest fractional part, so the shares always add up to `totalMinor`.
 */
export function computeItemShares(
  order: { subtotalMinor: number; totalMinor: number },
  items: { id: string; lineTotalMinor: number }[],
): Map<string, number> {
  const shares = new Map<string, number>();
  if (items.length === 0) return shares;
  const subtotal = items.reduce((sum, item) => sum + item.lineTotalMinor, 0);
  if (subtotal <= 0 || order.totalMinor <= 0) {
    for (const item of items) shares.set(item.id, 0);
    return shares;
  }
  const rows = items.map((item, index) => {
    const exact = item.lineTotalMinor * order.totalMinor;
    const base = Math.floor(exact / subtotal);
    return { id: item.id, index, base, fraction: exact - base * subtotal };
  });
  let leftover = order.totalMinor - rows.reduce((sum, row) => sum + row.base, 0);
  const byFraction = [...rows].sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const row of byFraction) {
    if (leftover <= 0) break;
    row.base += 1;
    leftover -= 1;
  }
  for (const row of rows) shares.set(row.id, row.base);
  return shares;
}
