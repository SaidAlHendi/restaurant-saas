import { useCallback, useState } from 'react';

import { clearStoredDevice, readStoredDevice, type StoredDevice } from '../device-key-storage.js';

export type LoginMode = 'pin' | 'email' | 'pair';

/**
 * A linked device opens on the PIN screen; otherwise the email form. Linking and unlinking happen on
 * this page, and the lock never trades away the email route, so an owner can always sign in.
 */
export function useLoginMode() {
  const [device, setDevice] = useState<StoredDevice | null>(() => readStoredDevice());
  const [mode, setMode] = useState<LoginMode>(() => (readStoredDevice() ? 'pin' : 'email'));

  const showPin = useCallback(() => {
    setMode('pin');
  }, []);
  const showEmail = useCallback(() => {
    setMode('email');
  }, []);
  const showPair = useCallback(() => {
    setMode('pair');
  }, []);
  const onPaired = useCallback((paired: StoredDevice) => {
    setDevice(paired);
    setMode('pin');
  }, []);
  const unlink = useCallback(() => {
    clearStoredDevice();
    setDevice(null);
    setMode('email');
  }, []);

  return {
    device,
    mode: mode === 'pin' && device === null ? 'email' : mode,
    showPin,
    showEmail,
    showPair,
    onPaired,
    unlink,
  };
}
