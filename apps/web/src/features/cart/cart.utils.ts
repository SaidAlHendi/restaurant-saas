import { computeOrderTotals, type OrderLineForTotals } from '@app/shared';

import type { CartLine } from './cart.types.js';

export function newCartLineId(): string {
  return crypto.randomUUID();
}

export function newClientOrderId(): string {
  return crypto.randomUUID();
}

export function cartLineMergeKey(line: Pick<CartLine, 'productId' | 'modifierIds' | 'note'>): string {
  const mods = [...line.modifierIds].sort().join(',');
  const noteKey = line.note.trim().length === 0 ? '' : line.note.trim();
  return `${line.productId}|${mods}|${noteKey}`;
}

export function mergeCartLine(existing: CartLine[], incoming: CartLine): CartLine[] {
  const key = cartLineMergeKey(incoming);
  const index = existing.findIndex((line) => cartLineMergeKey(line) === key);
  if (index === -1) {
    return [...existing, incoming];
  }
  const copy = [...existing];
  const current = copy[index];
  if (current === undefined) {
    return [...existing, incoming];
  }
  copy[index] = { ...current, quantity: current.quantity + incoming.quantity };
  return copy;
}

export type ModifierGroupRule = {
  id: string;
  minSelect: number;
  maxSelect: number;
  modifierIds: string[];
};

export function validateModifierSelection(
  groups: ModifierGroupRule[],
  selectedIds: string[],
): { ok: true } | { ok: false; groupId: string } {
  const selectedSet = new Set(selectedIds);
  for (const group of groups) {
    const count = group.modifierIds.filter((id) => selectedSet.has(id)).length;
    if (count < group.minSelect || count > group.maxSelect) {
      return { ok: false, groupId: group.id };
    }
  }
  return { ok: true };
}

export function cartTotalsPreview(input: {
  lines: CartLine[];
  taxRateBp: number;
  taxInclusive: boolean;
}): ReturnType<typeof computeOrderTotals> {
  const orderLines: OrderLineForTotals[] = input.lines.map((line) => ({
    lineTotalMinor: line.unitPriceMinor * line.quantity,
    status: 'pending',
  }));
  return computeOrderTotals({
    lines: orderLines,
    discountMinor: 0,
    taxRateBp: input.taxRateBp,
    taxInclusive: input.taxInclusive,
  });
}

export function cartIsEmpty(lines: CartLine[]): boolean {
  return lines.length === 0;
}
