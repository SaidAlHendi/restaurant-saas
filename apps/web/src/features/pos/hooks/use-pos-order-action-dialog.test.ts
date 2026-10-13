import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePosOrderActionDialog } from './use-pos-order-action-dialog.js';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const managerId = '01932a1a-7b3e-7000-8000-000000000041';

vi.mock('../pos.api.js', () => ({
  useListPinUsersQuery: () => ({
    data: {
      items: [
        {
          membershipId: managerId,
          name: 'Manager',
          roleKey: 'manager',
        },
      ],
    },
  }),
}));

describe('usePosOrderActionDialog', () => {
  it('walks reason then approval and passes approval in execute', async () => {
    const onExecute = vi.fn().mockResolvedValue({ ok: true as const });
    const onClose = vi.fn();

    const { result } = renderHook(() =>
      usePosOrderActionDialog({
        branchId: '01932a1a-7b3e-7000-8000-000000000030',
        open: true,
        needsApproval: true,
        onClose,
        submitting: false,
        title: 'Cancel',
        reasonLabel: 'Reason',
        confirmLabel: 'Confirm',
        cancelLabel: 'Back',
        onExecute,
      }),
    );

    act(() => {
      result.current.onReasonChange('Wrong order');
    });
    act(() => {
      result.current.onPrimary();
    });
    expect(result.current.step).toBe('approval');

    act(() => {
      result.current.approvers[0]?.onSelect();
    });
    act(() => {
      result.current.pinPad.onDigit('1');
      result.current.pinPad.onDigit('2');
      result.current.pinPad.onDigit('3');
      result.current.pinPad.onDigit('4');
    });
    act(() => {
      result.current.onPrimary();
    });

    await waitFor(() => {
      expect(onExecute).toHaveBeenCalledWith({
        reason: 'Wrong order',
        approval: { membershipId: managerId, pin: '1234' },
      });
    });
    expect(onClose).toHaveBeenCalled();
  });
});
