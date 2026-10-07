import { describe, expect, it } from 'vitest';

import { reorderByDrag } from './menu.utils.js';

describe('reorderByDrag', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('returns null when over is missing or same as active', () => {
    expect(reorderByDrag(items, 'a', undefined)).toBeNull();
    expect(reorderByDrag(items, 'a', 'a')).toBeNull();
  });

  it('moves an item to a new index', () => {
    expect(reorderByDrag(items, 'a', 'c')).toEqual(['b', 'c', 'a']);
    expect(reorderByDrag(items, 'c', 'a')).toEqual(['c', 'a', 'b']);
  });

  it('returns null for unknown ids', () => {
    expect(reorderByDrag(items, 'x', 'a')).toBeNull();
  });
});
