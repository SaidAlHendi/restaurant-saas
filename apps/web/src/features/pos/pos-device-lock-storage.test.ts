import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  POS_DEVICE_LOCKED_STORAGE_KEY,
  readPosDeviceLocked,
  writePosDeviceLocked,
} from './pos-device-lock-storage.js';

describe('pos device lock storage', () => {
  afterEach(() => {
    window.localStorage.removeItem(POS_DEVICE_LOCKED_STORAGE_KEY);
  });

  it('persists the locked flag in localStorage', () => {
    expect(readPosDeviceLocked()).toBe(false);
    writePosDeviceLocked(true);
    expect(window.localStorage.getItem(POS_DEVICE_LOCKED_STORAGE_KEY)).toBe('true');
    expect(readPosDeviceLocked()).toBe(true);
    writePosDeviceLocked(false);
    expect(readPosDeviceLocked()).toBe(false);
  });

  it('returns false when storage throws', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readPosDeviceLocked()).toBe(false);
    getItem.mockRestore();
  });
});
