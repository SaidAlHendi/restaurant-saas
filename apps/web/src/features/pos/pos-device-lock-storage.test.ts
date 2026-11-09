import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  LEGACY_POS_DEVICE_LOCKED_STORAGE_KEY,
  posDeviceLockedStorageKey,
  readPosDeviceLocked,
  writePosDeviceLocked,
} from './pos-device-lock-storage.js';

const ORG_A = '01932a1a-7b3e-7000-8000-00000000000a';
const ORG_B = '01932a1a-7b3e-7000-8000-00000000000b';

describe('pos device lock storage', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('persists the locked flag per restaurant', () => {
    expect(readPosDeviceLocked(ORG_A)).toBe(false);
    writePosDeviceLocked(ORG_A, true);
    expect(window.localStorage.getItem(posDeviceLockedStorageKey(ORG_A))).toBe('true');
    expect(readPosDeviceLocked(ORG_A)).toBe(true);
    writePosDeviceLocked(ORG_A, false);
    expect(readPosDeviceLocked(ORG_A)).toBe(false);
  });

  it('does not lock another restaurant on the same browser', () => {
    writePosDeviceLocked(ORG_A, true);
    expect(readPosDeviceLocked(ORG_B)).toBe(false);
  });

  it('ignores and removes the legacy browser-wide flag', () => {
    window.localStorage.setItem(LEGACY_POS_DEVICE_LOCKED_STORAGE_KEY, 'true');
    expect(readPosDeviceLocked(ORG_A)).toBe(false);
    expect(window.localStorage.getItem(LEGACY_POS_DEVICE_LOCKED_STORAGE_KEY)).toBeNull();
  });

  it('is never locked without an org', () => {
    writePosDeviceLocked(null, true);
    expect(readPosDeviceLocked(null)).toBe(false);
  });

  it('returns false when storage throws', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readPosDeviceLocked(ORG_A)).toBe(false);
    getItem.mockRestore();
  });
});
