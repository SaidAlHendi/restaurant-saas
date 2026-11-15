import { describe, expect, it } from 'vitest';

import { pageMeta, pageQuerySchema, pageWindow, slicePage } from './page-pagination.js';

describe('page pagination', () => {
  it('returns everything when no page is requested', () => {
    expect(pageWindow({})).toBeNull();
    expect(slicePage([1, 2, 3], {})).toEqual({ items: [1, 2, 3], page: 1, pageSize: 3, total: 3 });
  });
  it('slices a page', () => {
    expect(slicePage([1, 2, 3, 4, 5], { page: 2, pageSize: 2 })).toEqual({
      items: [3, 4],
      page: 2,
      pageSize: 2,
      total: 5,
    });
    expect(pageWindow({ page: 3 })).toEqual({ limit: 20, offset: 40 });
    expect(pageMeta({ pageSize: 10 }, 4)).toEqual({ page: 1, pageSize: 10, total: 4 });
  });
  it('validates bounds', () => {
    expect(pageQuerySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(pageQuerySchema.safeParse({ pageSize: '101' }).success).toBe(false);
    expect(pageQuerySchema.parse({ page: '2', pageSize: '50' })).toEqual({ page: 2, pageSize: 50 });
  });
});
