import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardOrdersView } from './DashboardOrdersView.js';
import type { DashboardOrdersPageViewModel } from '../hooks/use-dashboard-orders-page.js';

function minimalOrdersVm(overrides: Partial<DashboardOrdersPageViewModel> = {}): DashboardOrdersPageViewModel {
  return {
    searchInputKey: 'branch-1',
    orgSwitcher: {
      org: {
        id: 'o1',
        name: 'Org',
        slug: 'org',
        defaultLocale: 'en',
        locales: ['en'],
        defaultCurrency: 'SAR',
        logoUrl: null,
      },
      orgs: [],
      showOrgSwitcher: false,
      switchingOrg: false,
      onOrgChange: () => {},
      labels: { org: 'Org', selectOrg: 'Select' },
    },
    branchContextError: false,
    branchContextLoading: false,
    filters: {
      q: '',
      status: 'all',
      type: 'all',
      paymentMethod: 'all',
      period: 'today',
      dateFrom: '2026-03-15',
      dateTo: '2026-03-15',
    },
    search: { value: '', onChange: () => {}, placeholder: 'Search', clearLabel: 'Clear' },
    status: { value: 'all', onChange: () => {} },
    type: { value: 'all', onChange: () => {} },
    paymentMethod: { value: 'all', onChange: () => {} },
    statusOptions: [{ value: 'all', label: 'All' }],
    typeOptions: [{ value: 'all', label: 'All' }],
    paymentMethodOptions: [{ value: 'all', label: 'All' }],
    period: {
      value: 'today',
      onChange: () => {},
      customFrom: '2026-03-15',
      customTo: '2026-03-15',
      onCustomFromChange: () => {},
      onCustomToChange: () => {},
    },
    showEmptyState: false,
    rows: [
      {
        id: '01932a1a-7b3e-7000-8000-000000000050',
        orderNumber: '42',
        dateTimeLabel: '3/15/26, 1:00 PM',
        typeTable: 'Takeaway',
        itemCount: '2',
        totalLabel: 'SAR 50.00',
        statusTone: 'new',
        statusLabel: 'Placed',
        paymentLabel: 'Paid',
        paymentMethodsLabel: 'Cash',
        onSelect: () => {},
      },
    ],
    isLoading: false,
    isError: false,
    isFetching: false,
    loadMore: null,
    onRetry: () => {},
    labels: {
      title: 'Orders',
      loading: 'Loading',
      retry: 'Retry',
      empty: 'Empty',
      error: 'Error',
      branchDateError: 'Branch date error',
      status: 'Status',
      type: 'Type',
      payment: 'Payment',
      period: 'Period',
      periodToday: 'Today',
      periodYesterday: 'Yesterday',
      periodLast7: 'Last 7',
      periodLast30: 'Last 30',
      periodCustom: 'Custom',
      from: 'From',
      to: 'To',
      colNumber: 'No.',
      colDateTime: 'When',
      colCustomer: 'Customer',
      colItems: 'Items',
      colTotal: 'Total',
      colStatus: 'Status',
      colPayment: 'Payment',
      tableSortBy: 'Sort by',
      tableRowActions: 'Row actions',
    },
    ...overrides,
  };
}

describe('DashboardOrdersView', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders order rows from the view model', () => {
    render(<DashboardOrdersView {...minimalOrdersVm()} />);
    expect(screen.getAllByText('42').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('SAR 50.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Placed').length).toBeGreaterThanOrEqual(1);
  });
});

describe('DashboardOrdersView search', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps search focus and value after debounced URL sync', () => {
    const onSearchChange = vi.fn();
    const initial = minimalOrdersVm({
      search: { value: '', onChange: onSearchChange, placeholder: 'Search', clearLabel: 'Clear' },
    });
    const { container, rerender } = render(<DashboardOrdersView {...initial} />);
    const input = within(container).getByPlaceholderText('Search');
    act(() => {
      input.focus();
    });
    fireEvent.change(input, { target: { value: 'bur' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onSearchChange).toHaveBeenCalledWith('bur');

    const syncedFilters = {
      q: 'bur',
      status: 'all' as const,
      type: 'all' as const,
      paymentMethod: 'all' as const,
      period: 'today' as const,
      dateFrom: '2026-03-15',
      dateTo: '2026-03-15',
    };
    rerender(
      <DashboardOrdersView
        {...minimalOrdersVm({
          filters: syncedFilters,
          search: {
            value: 'bur',
            onChange: onSearchChange,
            placeholder: 'Search',
            clearLabel: 'Clear',
          },
        })}
      />,
    );

    const inputAfterSync = within(container).getByPlaceholderText('Search');
    expect(inputAfterSync).toBe(input);
    expect(inputAfterSync).toHaveValue('bur');
    expect(document.activeElement).toBe(inputAfterSync);
  });
});
