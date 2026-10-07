import { describe, expect, it } from 'vitest';

import { menuApiErrorMessage, parseMenuApiErrorCode } from './menu-api-errors.js';

const t = (key: string) => key;

describe('parseMenuApiErrorCode', () => {
  it('reads nested API error code from RTK fetch errors', () => {
    expect(
      parseMenuApiErrorCode({
        status: 409,
        data: { error: { code: 'CATEGORY_HAS_ACTIVE_PRODUCTS' } },
      }),
    ).toBe('CATEGORY_HAS_ACTIVE_PRODUCTS');
  });

  it('returns UNKNOWN for unrecognized shapes', () => {
    expect(parseMenuApiErrorCode(null)).toBe('UNKNOWN');
    expect(parseMenuApiErrorCode({ status: 500, data: {} })).toBe('UNKNOWN');
  });
});

describe('menuApiErrorMessage', () => {
  it('maps known codes to menu.errors keys', () => {
    expect(menuApiErrorMessage(t, 'FILE_TOO_LARGE')).toBe('menu.errors.fileTooLarge');
    expect(menuApiErrorMessage(t, 'NOT_FOUND')).toBe('menu.errors.notFound');
    expect(menuApiErrorMessage(t, 'UNKNOWN')).toBe('menu.errors.generic');
  });
});
