import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  POS_DEVICE_LOCKED_STORAGE_KEY,
  writePosDeviceLocked,
} from '../pos-device-lock-storage.js';
import { usePosArea } from './use-pos-area.js';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('./use-pos-lock-screen.js', () => ({
  usePosLockScreen: () => ({ loading: false }),
}));

const permissions = ['orders.create'];

vi.mock('../../../app/hooks.js', () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({
      session: {
        bootstrapDone: true,
        permissions,
        currentBranchId: '01932a1a-7b3e-7000-8000-000000000030',
      },
    }),
}));

vi.mock('../../session/session.selectors.js', () => ({
  selectBootstrapDone: (state: { session: { bootstrapDone: boolean } }) =>
    state.session.bootstrapDone,
  selectCan:
    () =>
    (state: { session: { permissions: string[] } }) =>
      state.session.permissions.includes('orders.create'),
  selectCurrentBranchId: (state: { session: { currentBranchId: string } }) =>
    state.session.currentBranchId,
}));

describe('usePosArea device lock', () => {
  afterEach(() => {
    window.localStorage.removeItem(POS_DEVICE_LOCKED_STORAGE_KEY);
    permissions.splice(0, permissions.length, 'orders.create');
  });

  it('starts with lock screen when the device flag is set', () => {
    writePosDeviceLocked(true);
    const { result, unmount } = renderHook(() => usePosArea());
    expect(result.current.showLockScreen).toBe(true);
    unmount();
    const { result: again } = renderHook(() => usePosArea());
    expect(again.current.showLockScreen).toBe(true);
  });

  it('shows no access without create permission when not locked', () => {
    permissions.splice(0, permissions.length);
    const { result } = renderHook(() => usePosArea());
    expect(result.current.showLockScreen).toBe(false);
    expect(result.current.showNoAccess).toBe(true);
  });
});
