import { describe, expect, it } from 'vitest';

import type { CartLine } from './cart.types.js';
import {
  cartLineMergeKey,
  cartTotalsPreview,
  mergeCartLine,
  validateModifierSelection,
} from './cart.utils.js';

function line(partial: Partial<CartLine> & Pick<CartLine, 'productId'>): CartLine {
  return {
    localId: '1',
    nameSnapshot: { en: 'Item' },
    unitPriceMinor: 1000,
    modifierIds: [],
    modifierNames: {},
    quantity: 1,
    note: '',
    ...partial,
  };
}

describe('mergeCartLine', () => {
  it('merges same product, modifiers and empty note', () => {
    const a = line({ productId: 'p1', localId: 'a' });
    const b = line({ productId: 'p1', localId: 'b' });
    const merged = mergeCartLine([a], b);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.quantity).toBe(2);
  });

  it('does not merge when note differs', () => {
    const a = line({ productId: 'p1', note: 'extra' });
    const b = line({ productId: 'p1', note: '' });
    expect(mergeCartLine([a], b)).toHaveLength(2);
  });
});

describe('validateModifierSelection', () => {
  it('enforces min and max per group', () => {
    const result = validateModifierSelection(
      [{ id: 'g1', minSelect: 1, maxSelect: 1, modifierIds: ['m1', 'm2'] }],
      [],
    );
    expect(result.ok).toBe(false);
  });
});

describe('cartTotalsPreview', () => {
  it('uses shared tax math', () => {
    const totals = cartTotalsPreview({
      lines: [line({ productId: 'p1', unitPriceMinor: 1000, quantity: 2 })],
      taxRateBp: 1500,
      taxInclusive: false,
    });
    expect(totals.totalMinor).toBe(2300);
  });
});

describe('cartLineMergeKey', () => {
  it('sorts modifier ids', () => {
    const k1 = cartLineMergeKey({ productId: 'p', modifierIds: ['b', 'a'], note: '' });
    const k2 = cartLineMergeKey({ productId: 'p', modifierIds: ['a', 'b'], note: '' });
    expect(k1).toBe(k2);
  });
});
