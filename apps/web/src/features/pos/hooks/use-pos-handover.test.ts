import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HANDOVER_UNDO_MS, usePosHandover } from './use-pos-handover.js';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const toastMock = vi.hoisted(() => vi.fn());
vi.mock('@app/ui', () => ({ toast: Object.assign(toastMock, { error: vi.fn() }) }));

const changeStatus = vi.hoisted(() => vi.fn());
vi.mock('../../orders/orders.api.js', () => ({
  useChangeOrderStatusMutation: () => [changeStatus, { isLoading: false }],
}));
vi.mock('../../orders/show-orders-api-error.js', () => ({ showOrdersApiError: vi.fn() }));

const order = { id: 'order-1', version: 4, orderNumber: 12 };

describe('usePosHandover', () => {
  beforeEach(() => {
    toastMock.mockReset();
    changeStatus.mockReset();
  });

  it('completes the order and shows a 10-second Undo toast', async () => {
    changeStatus.mockResolvedValue({ data: { version: 5 } });
    const { result } = renderHook(() => usePosHandover('branch-1'));
    let done = false;
    await act(async () => {
      done = await result.current.complete(order);
    });
    expect(done).toBe(true);
    expect(changeStatus).toHaveBeenCalledWith({
      branchId: 'branch-1',
      orderId: 'order-1',
      body: { to: 'completed', expectedVersion: 4 },
    });
    const options = toastMock.mock.calls[0]?.[1] as {
      duration: number;
      action: { onClick: () => void };
    };
    expect(options.duration).toBe(HANDOVER_UNDO_MS);
    expect(HANDOVER_UNDO_MS).toBe(10_000);

    changeStatus.mockResolvedValue({ data: { version: 6 } });
    act(() => {
      options.action.onClick();
    });
    await vi.waitFor(() => {
      expect(changeStatus).toHaveBeenCalledTimes(2);
    });
    expect(changeStatus).toHaveBeenLastCalledWith({
      branchId: 'branch-1',
      orderId: 'order-1',
      body: { to: 'ready', expectedVersion: 5, undo: true },
    });
  });

  it('shows no Undo toast when the server refuses (e.g. not paid)', async () => {
    changeStatus.mockResolvedValue({ error: { status: 422 } });
    const { result } = renderHook(() => usePosHandover('branch-1'));
    let done = true;
    await act(async () => {
      done = await result.current.complete(order);
    });
    expect(done).toBe(false);
    expect(toastMock).not.toHaveBeenCalled();
  });
});
