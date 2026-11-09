import { describe, expect, it } from 'vitest';

import { apiErrorCode } from './api-error-code.js';

describe('apiErrorCode', () => {
  it('reads the code from an API error body', () => {
    expect(apiErrorCode({ status: 401, data: { error: { code: 'DEVICE_INVALID' } } })).toBe(
      'DEVICE_INVALID',
    );
  });

  it('returns null for anything else', () => {
    expect(apiErrorCode(undefined)).toBeNull();
    expect(apiErrorCode({ status: 500 })).toBeNull();
    expect(apiErrorCode({ data: { error: { code: 5 } } })).toBeNull();
  });
});
