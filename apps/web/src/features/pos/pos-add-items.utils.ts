import type { AddOrderItemsBody } from '@app/shared';

import type { CartLine } from '../cart/cart.types.js';

export function buildAddOrderItemsBody(
  lines: CartLine[],
  expectedVersion: number,
): AddOrderItemsBody | null {
  if (lines.length === 0) {
    return null;
  }
  return {
    expectedVersion,
    items: lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      modifierIds: line.modifierIds,
      notes: line.note.trim().length > 0 ? line.note.trim() : undefined,
    })),
  };
}
