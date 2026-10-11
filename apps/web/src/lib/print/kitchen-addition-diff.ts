import type { OrderDetail, OrderItem } from '@app/shared';

const STORAGE_PREFIX = 'pos.kitchenPrinted.';

function storageKey(orderId: string): string {
  return `${STORAGE_PREFIX}${orderId}`;
}

export function loadPrintedKitchenItemIds(orderId: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(storageKey(orderId));
    if (!raw) {
      return new Set();
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    const ids = parsed.filter((id): id is string => typeof id === 'string');
    return new Set(ids);
  } catch {
    return new Set();
  }
}

export function savePrintedKitchenItemIds(orderId: string, itemIds: string[]): void {
  try {
    sessionStorage.setItem(storageKey(orderId), JSON.stringify(itemIds));
  } catch {
    // ignore quota / private mode
  }
}

export function activeOrderItems(order: OrderDetail): OrderItem[] {
  return order.items.filter((item) => item.status !== 'voided');
}

/** Items to print on a kitchen ticket (full order or additions only). */
export function kitchenItemsToPrint(
  order: OrderDetail,
  options: { additionsOnly: boolean },
): OrderItem[] {
  const active = activeOrderItems(order);
  if (!options.additionsOnly) {
    return active;
  }
  const printed = loadPrintedKitchenItemIds(order.id);
  return active.filter((item) => item.isAddition && !printed.has(item.id));
}

export function markKitchenItemsPrinted(order: OrderDetail, printedNow: OrderItem[]): void {
  const active = activeOrderItems(order);
  const merged = new Set(loadPrintedKitchenItemIds(order.id));
  for (const item of printedNow) {
    merged.add(item.id);
  }
  for (const item of active) {
    if (!item.isAddition) {
      merged.add(item.id);
    }
  }
  savePrintedKitchenItemIds(order.id, [...merged]);
}
