import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { readPosDeviceLocked, writePosDeviceLocked } from '../pos-device-lock-storage.js';
import { usePosArea } from './use-pos-area.js';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const lockScreenState = { noPinUsers: false };
const logoutMock = vi.fn(() => ({ unwrap: () => Promise.resolve(undefined) }));
const dispatchMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('./use-pos-lock-screen.js', () => ({
  usePosLockScreen: (input: { onSignOut: () => void }) => ({
    loading: false,
    noPinUsers: lockScreenState.noPinUsers,
    onSignOut: input.onSignOut,
  }),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));

vi.mock('../../auth/auth.api.js', () => ({
  useLogoutMutation: () => [logoutMock, { isLoading: false }],
}));

vi.mock('../../session/session.slice.js', () => ({ clearSession: () => ({ type: 'clear' }) }));

const ORG_ID = '01932a1a-7b3e-7000-8000-000000000010';

const permissions = ['orders.create'];
const features = ['pos.access'];

vi.mock('../../../app/hooks.js', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({
      session: {
        bootstrapDone: true,
        permissions,
        currentBranchId: '01932a1a-7b3e-7000-8000-000000000030',
        org: { id: '01932a1a-7b3e-7000-8000-000000000010' },
      },
    }),
}));

vi.mock('../../session/session.selectors.js', () => ({
  selectBootstrapDone: (state: { session: { bootstrapDone: boolean } }) =>
    state.session.bootstrapDone,
  selectCan: () => (state: { session: { permissions: string[] } }) =>
    state.session.permissions.includes('orders.create'),
  selectCurrentBranchId: (state: { session: { currentBranchId: string } }) =>
    state.session.currentBranchId,
  selectHasFeature: (feature: string) => () => features.includes(feature),
  selectSessionOrg: (state: { session: { org: { id: string } } }) => state.session.org,
}));

describe('usePosArea device lock', () => {
  afterEach(() => {
    window.localStorage.clear();
    lockScreenState.noPinUsers = false;
    vi.clearAllMocks();
    permissions.splice(0, permissions.length, 'orders.create');
    features.splice(0, features.length, 'pos.access');
  });

  it('starts with lock screen when the device flag is set', () => {
    writePosDeviceLocked(ORG_ID, true);
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

  it('shows the upgrade screen when the plan has no cashier, even on a locked device', () => {
    features.splice(0, features.length);
    writePosDeviceLocked(ORG_ID, true);
    const { result } = renderHook(() => usePosArea());
    expect(result.current.showUpgrade).toBe(true);
    expect(result.current.showLockScreen).toBe(false);
    expect(result.current.showNoAccess).toBe(false);
  });

  it('drops the lock when nobody at the branch has a PIN', async () => {
    writePosDeviceLocked(ORG_ID, true);
    lockScreenState.noPinUsers = true;
    const { result } = renderHook(() => usePosArea());
    await waitFor(() => {
      expect(result.current.showLockScreen).toBe(false);
    });
    expect(readPosDeviceLocked(ORG_ID)).toBe(false);
  });

  it('signing out from the lock screen clears the flag and leaves for /login', async () => {
    writePosDeviceLocked(ORG_ID, true);
    const { result } = renderHook(() => usePosArea());
    result.current.lockScreen.onSignOut();
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true });
    });
    expect(readPosDeviceLocked(ORG_ID)).toBe(false);
    expect(dispatchMock).toHaveBeenCalledWith({ type: 'clear' });
  });
});
