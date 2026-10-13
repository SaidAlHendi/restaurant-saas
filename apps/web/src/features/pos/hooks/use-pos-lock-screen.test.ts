import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePosLockScreen } from './use-pos-lock-screen.js';

const membershipA = '01932a1a-7b3e-7000-8000-000000000050';
const membershipB = '01932a1a-7b3e-7000-8000-000000000051';

const { pinLogin } = vi.hoisted(() => ({
  pinLogin: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../../app/hooks.js', () => ({
  useAppDispatch: () => vi.fn(),
}));

vi.mock('../../auth/auth.api.js', () => ({
  authApi: { endpoints: { getMe: { initiate: vi.fn() } } },
  usePinLoginMutation: () => [pinLogin, { isLoading: false }],
}));

vi.mock('../pos.api.js', () => ({
  useListPinUsersQuery: () => ({
    data: {
      items: [
        { membershipId: membershipA, name: 'A', roleKey: 'cashier' },
        { membershipId: membershipB, name: 'B', roleKey: 'manager' },
      ],
    },
    isLoading: false,
  }),
}));

describe('usePosLockScreen user selection', () => {
  it('re-enables unlock when another user is selected after PIN lockout', async () => {
    pinLogin.mockResolvedValueOnce({
      error: {
        status: 429,
        data: {
          error: {
            code: 'PIN_LOCKED',
            details: { lockedUntil: '2099-01-01T00:00:00.000Z' },
          },
        },
      },
    });

    const { result } = renderHook(() =>
      usePosLockScreen({
        branchId: '01932a1a-7b3e-7000-8000-000000000030',
        enabled: true,
        onUnlocked: () => {},
      }),
    );

    act(() => {
      result.current.users[0]?.onSelect();
    });
    act(() => {
      for (const digit of ['1', '2', '3', '4']) {
        result.current.pinPad.onDigit(digit);
      }
    });

    act(() => {
      result.current.pinPad.onSubmit();
    });

    await waitFor(() => {
      expect(pinLogin).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(result.current.lockCountdown).not.toBeNull();
    });
    expect(result.current.pinPad.canSubmit).toBe(false);

    act(() => {
      result.current.users[1]?.onSelect();
    });
    expect(result.current.lockCountdown).toBeNull();

    act(() => {
      for (const digit of ['5', '6', '7', '8']) {
        result.current.pinPad.onDigit(digit);
      }
    });
    expect(result.current.pinPad.canSubmit).toBe(true);
  });
});
