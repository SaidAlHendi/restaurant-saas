import { describe, expect, it } from 'vitest';

import { buildPublicMenuUrl, buildPublicTableUrl } from './public-menu-urls.js';

describe('public-menu-urls', () => {
  it('buildPublicMenuUrl encodes slug segments', () => {
    const orgSlug = 'café demo';
    const branchSlug = 'north branch';
    const url = buildPublicMenuUrl(orgSlug, 'ar', branchSlug);
    expect(new URL(url).pathname).toBe(
      `/ar/m/${encodeURIComponent(orgSlug)}/${encodeURIComponent(branchSlug)}`,
    );
  });

  it('buildPublicTableUrl encodes token', () => {
    const token = 'tok/en+1';
    const url = buildPublicTableUrl(token);
    expect(new URL(url).pathname).toBe(`/t/${encodeURIComponent(token)}`);
  });
});
