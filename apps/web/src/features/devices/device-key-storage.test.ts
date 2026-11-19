import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEVICE_STORAGE_KEY,
  clearStoredDevice,
  readStoredDevice,
  writeStoredDevice,
  type StoredDevice,
} from './device-key-storage.js';

const device: StoredDevice = {
  key: 'k'.repeat(43),
  name: 'Front counter',
  orgName: 'Sahtain Cafe',
  branchName: 'Main',
};

describe('device key storage', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('round-trips a linked device and clears it', () => {
    expect(readStoredDevice()).toBeNull();
    writeStoredDevice(device);
    expect(readStoredDevice()).toEqual(device);
    clearStoredDevice();
    expect(readStoredDevice()).toBeNull();
  });

  it('ignores corrupt or incomplete values', () => {
    window.localStorage.setItem(DEVICE_STORAGE_KEY, '{not json');
    expect(readStoredDevice()).toBeNull();
    window.localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify({ key: 'short' }));
    expect(readStoredDevice()).toBeNull();
  });

  it('returns null when storage throws', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readStoredDevice()).toBeNull();
    getItem.mockRestore();
  });
});
