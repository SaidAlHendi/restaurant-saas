import { describe, expect, it } from 'vitest';

import { formatPinLockCountdown, parsePinLockedUntilIso } from './pos-pin-lock.utils.js';

describe('pos pin lock utils', () => {
  it('parses lockedUntil from RTK error payload', () => {
    const iso = '2026-10-13T12:00:00.000Z';
    expect(
      parsePinLockedUntilIso({
        status: 429,
        data: { error: { code: 'PIN_LOCKED', details: { lockedUntil: iso } } },
      }),
    ).toBe(iso);
  });

  it('formats countdown mm:ss until expiry', () => {
    const lockedUntil = '2026-10-13T12:01:30.000Z';
    const now = Date.parse('2026-10-13T12:00:00.000Z');
    expect(formatPinLockCountdown(lockedUntil, now)).toBe('1:30');
  });

  it('returns null when lock expired', () => {
    const lockedUntil = '2026-10-13T12:00:00.000Z';
    const now = Date.parse('2026-10-13T12:00:01.000Z');
    expect(formatPinLockCountdown(lockedUntil, now)).toBeNull();
  });
});
