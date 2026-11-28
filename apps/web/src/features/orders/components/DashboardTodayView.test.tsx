import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(cleanup);

import { DashboardTodayView } from './DashboardTodayView.js';
import type { DashboardTodayPageViewModel } from '../hooks/use-dashboard-today-page.js';

function minimalTodayVm(
  overrides: Partial<DashboardTodayPageViewModel> = {},
): DashboardTodayPageViewModel {
  return {
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
    isLoading: false,
    isError: false,
    onRetry: () => {},
    dateLocale: 'en',
    selectedDate: '2026-03-15',
    onSelectToday: () => {},
    onSelectYesterday: () => {},
    onDateInputChange: () => {},
    stats: {
      sales: 'SAR 120.00',
      orders: '8',
      averageTicket: 'SAR 15.00',
      unpaid: 'SAR 0.00',
      cancelled: '1',
    },
    deltas: null,
    live: { open: '2', waiting: '1', ready: '0', oldest: '5 min', onOpenKitchen: () => {} },
    recentRows: [],
    onViewAllOrders: () => {},
    countedHref: '/dashboard/orders?status=counted',
    cancelledHref: '/dashboard/orders?status=cancelled',
    unpaidHref: '/dashboard/orders?status=unpaid',
    paymentBars: [],
    typeBars: [],
    topItems: [],
    timezone: 'Asia/Riyadh',
    labels: {
      title: 'Today',
      kpiHint: 'vs prev',
      salesBreakdown: 'Sales breakdown',
      salesBreakdownHint: 'hint',
      liveOps: 'Live operations',
      liveOpsHint: 'hint',
      livePill: 'Live',
      openOrders: 'Open orders',
      openOrdersHint: 'hint',
      waiting: 'Waiting',
      waitingHint: 'hint',
      readyOrders: 'Ready',
      readyHint: 'hint',
      oldest: 'Oldest',
      oldestHint: 'hint',
      openKitchen: 'Open kitchen',
      recent: 'Recent orders',
      recentHint: 'hint',
      viewAll: 'View all',
      colOrder: 'Order',
      colTime: 'Time',
      colWhere: 'Where',
      colItems: 'Items',
      colAmount: 'Amount',
      colStatus: 'Status',
      noRecent: 'No orders',
      popular: 'Popular',
      popularHint: 'hint',
      pickToday: 'Today',
      pickYesterday: 'Yesterday',
      dateLabel: 'Date',
      sales: 'Sales',
      orders: 'Orders',
      averageTicket: 'Avg',
      unpaid: 'Unpaid',
      cancelled: 'Cancelled',
      paymentBreakdown: 'Payments',
      typeBreakdown: 'Types',
      topItems: 'Top',
      topItemsName: 'Name',
      topItemsQty: 'Qty',
      topItemsRevenue: 'Rev',
      empty: 'Empty',
      error: 'Error',
      loading: 'Loading',
      retry: 'Retry',
    },
    ...overrides,
  };
}

const renderView = (ui: ReactElement) => render(ui, { wrapper: MemoryRouter });

describe('DashboardTodayView', () => {
  it('shows stat values from the view model', () => {
    renderView(<DashboardTodayView {...minimalTodayVm()} />);
    expect(screen.getByText('SAR 120.00')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('SAR 15.00')).toBeInTheDocument();
  });

  it('shows live operations counts', () => {
    renderView(<DashboardTodayView {...minimalTodayVm()} />);
    expect(screen.getByText('Live operations')).toBeInTheDocument();
    expect(screen.getByText('5 min')).toBeInTheDocument();
  });

  it('links the sales, orders, unpaid and cancelled cards to the order list', () => {
    renderView(<DashboardTodayView {...minimalTodayVm()} />);
    for (const name of [/Sales/, /Orders/]) {
      expect(screen.getByRole('link', { name })).toHaveAttribute(
        'href',
        '/dashboard/orders?status=counted',
      );
    }
    expect(screen.getByRole('link', { name: /Cancelled/ })).toHaveAttribute(
      'href',
      '/dashboard/orders?status=cancelled',
    );
    expect(screen.getByRole('link', { name: /Unpaid/ })).toHaveAttribute(
      'href',
      '/dashboard/orders?status=unpaid',
    );
    expect(screen.getAllByRole('link')).toHaveLength(4);
  });

  it('opens a recent order once, from the row or its number', () => {
    const onOpen = vi.fn();
    renderView(
      <DashboardTodayView
        {...minimalTodayVm({
          recentRows: [
            {
              id: 'r1',
              number: '#7',
              time: '12:00',
              where: 'T1',
              items: '2 items',
              total: 'SAR 10.00',
              status: 'ready',
              statusLabel: 'Ready now',
              onOpen,
            },
          ],
        })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '#7' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('T1'));
    expect(onOpen).toHaveBeenCalledTimes(2);
  });
});
