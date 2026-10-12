import { describe, expect, it } from 'vitest';

import type { PosMenuPayload } from '@app/shared';

import type { CartLine } from '../cart/cart.types.js';
import {
  ALL_CATEGORIES,
  lastLineOfProduct,
  quantityByProduct,
  visiblePosProducts,
} from './pos-catalog.utils.js';

type Category = PosMenuPayload['categories'][number];

function product(id: string, en: string, ar: string) {
  return { id, name: { en, ar } } as unknown as Category['products'][number];
}

const categories = [
  { id: 'c1', products: [product('p1', 'Hummus', 'حمص'), product('p2', 'Falafel', 'فلافل')] },
  { id: 'c2', products: [product('p3', 'Mint tea', 'شاي بالنعناع')] },
] as unknown as Category[];

function line(localId: string, productId: string, quantity: number): CartLine {
  return {
    localId,
    productId,
    nameSnapshot: { en: productId },
    unitPriceMinor: 100,
    modifierIds: [],
    modifierNames: {},
    quantity,
    note: '',
  };
}

describe('visiblePosProducts', () => {
  it('shows every product for "all" and one category otherwise', () => {
    expect(visiblePosProducts(categories, ALL_CATEGORIES, '').map((p) => p.id)).toEqual([
      'p1',
      'p2',
      'p3',
    ]);
    expect(visiblePosProducts(categories, 'c2', '').map((p) => p.id)).toEqual(['p3']);
  });

  it('searches every translation, ignoring case and spaces around the query', () => {
    expect(visiblePosProducts(categories, ALL_CATEGORIES, ' FALA ').map((p) => p.id)).toEqual([
      'p2',
    ]);
    expect(visiblePosProducts(categories, ALL_CATEGORIES, 'شاي').map((p) => p.id)).toEqual(['p3']);
    expect(visiblePosProducts(categories, 'c1', 'tea')).toEqual([]);
  });
});

describe('cart quantities per product', () => {
  const lines = [line('a', 'p1', 2), line('b', 'p2', 1), line('c', 'p1', 3)];

  it('adds up lines of the same product', () => {
    const quantities = quantityByProduct(lines);
    expect(quantities.get('p1')).toBe(5);
    expect(quantities.get('p2')).toBe(1);
    expect(quantities.get('p3')).toBeUndefined();
  });

  it('finds the newest line of a product', () => {
    expect(lastLineOfProduct(lines, 'p1')?.localId).toBe('c');
    expect(lastLineOfProduct(lines, 'p3')).toBeNull();
  });
});
