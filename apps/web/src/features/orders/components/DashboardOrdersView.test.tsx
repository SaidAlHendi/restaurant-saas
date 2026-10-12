import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DashboardOrdersView } from './DashboardOrdersView.js';
import type { DashboardOrdersPageViewModel } from '../hooks/use-dashboard-orders-page.js';

function minimalOrdersVm(overrides: Partial<DashboardOrdersPageViewModel> = {}): DashboardOrdersPageViewModel {
  return {
    orgSwitcher: {
      org: { id: 'o1', name: 'Org', slug: 'org', defaultLocale: 'en', locales: ['en'], defaultCurrency: 'SAR' },
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
  it('renders order rows from the view model', () => {
    render(<DashboardOrdersView {...minimalOrdersVm()} />);
    expect(screen.getAllByText('42').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('SAR 50.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Placed').length).toBeGreaterThanOrEqual(1);
  });
});
