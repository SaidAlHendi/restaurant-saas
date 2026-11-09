import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DEVICE_STORAGE_KEY, readStoredDevice, writeStoredDevice } from '../device-key-storage.js';
import { useLoginMode } from './use-login-mode.js';

const device = {
  key: 'k'.repeat(43),
  name: 'Front counter',
  orgName: 'Sahtain Cafe',
  branchName: 'Main',
};

describe('useLoginMode', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('opens on the email form when no device is linked', () => {
    const { result } = renderHook(() => useLoginMode());
    expect(result.current.mode).toBe('email');
    expect(result.current.device).toBeNull();
  });

  it('opens on the PIN screen when a device is linked, and email stays reachable', () => {
    writeStoredDevice(device);
    const { result } = renderHook(() => useLoginMode());
    expect(result.current.mode).toBe('pin');
    act(() => {
      result.current.showEmail();
    });
    expect(result.current.mode).toBe('email');
    act(() => {
      result.current.showPin();
    });
    expect(result.current.mode).toBe('pin');
  });

  it('unlinking forgets the key and falls back to email', () => {
    writeStoredDevice(device);
    const { result } = renderHook(() => useLoginMode());
    act(() => {
      result.current.unlink();
    });
    expect(result.current.mode).toBe('email');
    expect(window.localStorage.getItem(DEVICE_STORAGE_KEY)).toBeNull();
    expect(readStoredDevice()).toBeNull();
  });

  it('pairing switches to the PIN screen', () => {
    const { result } = renderHook(() => useLoginMode());
    act(() => {
      result.current.showPair();
    });
    expect(result.current.mode).toBe('pair');
    act(() => {
      result.current.onPaired(device);
    });
    expect(result.current.mode).toBe('pin');
    expect(result.current.device).toEqual(device);
  });
});
