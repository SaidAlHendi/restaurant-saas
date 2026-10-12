import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { OrderListItem } from '@app/shared';

import { useDashboardOrdersPage } from './use-dashboard-orders-page.js';

const sampleOrder = {
  id: '01932a1a-7b3e-7000-8000-000000000050',
  orgId: '01932a1a-7b3e-7000-8000-000000000010',
  branchId: '01932a1a-7b3e-7000-8000-000000000030',
  clientOrderId: '01932a1a-7b3e-7000-8000-000000000051',
  orderNumber: 42,
  businessDate: '2026-03-15',
  type: 'takeaway' as const,
  status: 'placed' as const,
  paymentStatus: 'paid' as const,
  paidMinor: 1000,
  dueMinor: 0,
  subtotalMinor: 1000,
  discountMinor: 0,
  taxMinor: 0,
  totalMinor: 1000,
  currency: 'SAR',
  tableId: null,
  customerName: null,
  notes: null,
  version: 1,
  placedAt: '2026-03-15T10:00:00.000Z',
  completedAt: null,
  cancelledAt: null,
  cancelReason: null,
  createdAt: '2026-03-15T10:00:00.000Z',
  updatedAt: '2026-03-15T10:00:00.000Z',
  itemCount: 1,
  tableLabel: null,
  paymentMethods: ['cash' as const],
} satisfies OrderListItem;

let listQueryResult: {
  data: { items: OrderListItem[]; nextCursor: null };
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  refetch: () => void;
} = {
  data: { items: [sampleOrder], nextCursor: null },
  isLoading: false,
  isError: false,
  isFetching: false,
  refetch: () => {},
};

let realtimeHandlers: {
  onEvent?: (event: { type: string }) => void;
  onResync?: () => void;
} = {};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

const { ordersSearchParams } = vi.hoisted(() => ({
  ordersSearchParams: new URLSearchParams('period=today'),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => () => {},
  useSearchParams: () => [ordersSearchParams, () => {}],
}));

vi.mock('../../../app/api/base-api.js', () => ({
  baseApi: {
    util: {
      invalidateTags: vi.fn(() => ({ type: 'invalidateTags' })),
    },
  },
}));

vi.mock('../../../app/hooks.js', () => ({
  useAppDispatch: () => () => {},
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({
      session: {
        org: { defaultCurrency: 'SAR', defaultLocale: 'en' },
        currentBranchId: '01932a1a-7b3e-7000-8000-000000000030',
      },
    }),
}));

vi.mock('../../realtime/use-branch-realtime.js', () => ({
  useBranchRealtime: (opts: typeof realtimeHandlers) => {
    realtimeHandlers = opts;
  },
}));

vi.mock('./use-branch-business-date.js', () => ({
  useBranchBusinessDate: () => ({
    businessDate: '2026-03-15',
    timezone: 'UTC',
    currency: 'SAR',
    isLoading: false,
    isError: false,
    refetch: () => {},
  }),
}));

vi.mock('./use-org-switcher.js', () => ({
  useOrgSwitcher: () => ({
    org: null,
    orgs: [],
    showOrgSwitcher: false,
    switchingOrg: false,
    onOrgChange: () => {},
    labels: { org: '', selectOrg: '' },
  }),
}));

vi.mock('../orders.api.js', () => ({
  useListOrdersQuery: () => listQueryResult,
}));

describe('useDashboardOrdersPage realtime', () => {
  it('keeps rows visible while refetching after a realtime event', async () => {
    listQueryResult = {
      data: { items: [sampleOrder], nextCursor: null },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: () => {},
    };

    const { result, rerender } = renderHook(() => useDashboardOrdersPage());

    await waitFor(() => {
      expect(result.current.rows.length).toBe(1);
    });
    expect(result.current.showEmptyState).toBe(false);

    listQueryResult = {
      ...listQueryResult,
      isLoading: true,
      isFetching: true,
      data: undefined as unknown as { items: OrderListItem[]; nextCursor: null },
    };

    act(() => {
      realtimeHandlers.onEvent?.({ type: 'order.placed' });
    });

    rerender();

    expect(result.current.rows.length).toBe(1);
    expect(result.current.showEmptyState).toBe(false);
  });
});
