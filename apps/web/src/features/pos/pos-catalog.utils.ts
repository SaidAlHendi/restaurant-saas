import type { OrderStatus as BadgeStatus } from '@app/ui';
import type { OrderStatus, PosMenuPayload } from '@app/shared';

import type { CartLine } from '../cart/cart.types.js';

type PosCategory = PosMenuPayload['categories'][number];
type PosProduct = PosCategory['products'][number];

/** Category tile id that shows every product. */
export const ALL_CATEGORIES = 'all';

/**
 * Products for the grid: one category (or all of them), narrowed by a search over every
 * translation of the name so a cashier can type in either language.
 */
export function visiblePosProducts(
  categories: PosCategory[],
  activeCategoryId: string,
  query: string,
): PosProduct[] {
  const scope =
    activeCategoryId === ALL_CATEGORIES
      ? categories
      : categories.filter((category) => category.id === activeCategoryId);
  const products = scope.flatMap((category) => category.products);
  const needle = query.trim().toLocaleLowerCase();
  if (needle.length === 0) {
    return products;
  }
  return products.filter((product) =>
    Object.values(product.name).some((name) => name.toLocaleLowerCase().includes(needle)),
  );
}

/** Total quantity of each product across cart lines (lines differ by options and notes). */
export function quantityByProduct(lines: CartLine[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const line of lines) {
    out.set(line.productId, (out.get(line.productId) ?? 0) + line.quantity);
  }
  return out;
}

/** The newest line of a product: the one − on the product card takes one away from. */
export function lastLineOfProduct(lines: CartLine[], productId: string): CartLine | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line?.productId === productId) {
      return line;
    }
  }
  return null;
}

/** Badge color for an order status in the open orders strip. */
export function posOrderStatusTone(status: OrderStatus): BadgeStatus {
  switch (status) {
    case 'preparing':
      return 'preparing';
    case 'ready':
      return 'ready';
    case 'completed':
    case 'refunded':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'new';
  }
}
