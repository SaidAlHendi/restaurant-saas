import { describe, expect, it } from 'vitest';

import { getPageItems, usePagination } from './use-pagination.js';

describe('getPageItems', () => {
  it('lists every page when they fit', () => {
    expect(getPageItems(1, 1)).toEqual([1]);
    expect(getPageItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('returns nothing for no pages', () => {
    expect(getPageItems(1, 0)).toEqual([]);
  });

  it('puts an ellipsis at the end near the start', () => {
    expect(getPageItems(1, 20)).toEqual([1, 2, 3, 4, 5, 'ellipsis-end', 20]);
    expect(getPageItems(4, 20)).toEqual([1, 2, 3, 4, 5, 'ellipsis-end', 20]);
  });

  it('puts ellipses on both sides in the middle', () => {
    expect(getPageItems(6, 20)).toEqual([1, 'ellipsis-start', 5, 6, 7, 'ellipsis-end', 20]);
  });

  it('puts an ellipsis at the start near the end', () => {
    expect(getPageItems(20, 20)).toEqual([1, 'ellipsis-start', 16, 17, 18, 19, 20]);
    expect(getPageItems(17, 20)).toEqual([1, 'ellipsis-start', 16, 17, 18, 19, 20]);
  });

  it('keeps the item count stable while moving', () => {
    for (let page = 1; page <= 50; page++) {
      expect(getPageItems(page, 50)).toHaveLength(7);
    }
  });

  it('clamps an out-of-range page and supports more siblings', () => {
    expect(getPageItems(99, 20)).toEqual(getPageItems(20, 20));
    expect(getPageItems(10, 20, 2)).toEqual([
      1,
      'ellipsis-start',
      8,
      9,
      10,
      11,
      12,
      'ellipsis-end',
      20,
    ]);
  });
});

describe('usePagination', () => {
  it('reports previous/next availability', () => {
    expect(usePagination({ page: 1, pageCount: 3 })).toMatchObject({
      hasPrevious: false,
      hasNext: true,
    });
    expect(usePagination({ page: 3, pageCount: 3 })).toMatchObject({
      hasPrevious: true,
      hasNext: false,
    });
  });
});
