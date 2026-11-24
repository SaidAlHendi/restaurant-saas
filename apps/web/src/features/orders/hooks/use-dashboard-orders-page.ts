import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { OrderListItem } from '@app/shared';

import { baseApi } from '../../../app/api/base-api.js';
import { useAppDispatch, useAppSelector } from '../../../app/hooks.js';
import { intlLocaleForUi, orderMoneyFormatter } from '../../../lib/money.js';
import { listPaginationLabels, pageCountOf } from '../../../lib/pagination.js';
import type { RealtimeEvent } from '../../../lib/realtime.js';
import { useBranchRealtime } from '../../realtime/use-branch-realtime.js';
import {
  selectCurrentBranchId,
  selectSupportsDineIn,
  selectSupportsTakeaway,
} from '../../session/session.selectors.js';
import {
  dashboardOrdersFiltersToSearchParams,
  parseDashboardOrdersFilters,
  periodIncludesReferenceDay,
  type DashboardOrdersFilters,
  type DashboardOrdersPeriod,
} from '../dashboard-orders-filters.utils.js';
import { orderTypeTableLabel } from '../order-type-table-label.utils.js';
import { orderStatusBadgeTone } from '../orders-display.utils.js';
import { useListOrdersQuery } from '../orders.api.js';
import { useBranchBusinessDate } from './use-branch-business-date.js';
import { useOrgSwitcher } from './use-org-switcher.js';

const PAGE_SIZE = 10;

export function useDashboardOrdersPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const branchId = useAppSelector(selectCurrentBranchId);
  const supportsDineIn = useAppSelector(selectSupportsDineIn);
  const supportsTakeaway = useAppSelector(selectSupportsTakeaway);
  const orgSwitcher = useOrgSwitcher();
  const branchContext = useBranchBusinessDate(branchId);

  const referenceBusinessDate = branchContext.businessDate;
  const filters = useMemo(
    () =>
      referenceBusinessDate
        ? parseDashboardOrdersFilters(searchParams, referenceBusinessDate)
        : null,
    [referenceBusinessDate, searchParams],
  );

  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [
    filters?.dateFrom,
    filters?.dateTo,
    filters?.q,
    filters?.status,
    filters?.type,
    filters?.paymentMethod,
    branchId,
  ]);

  const listQuery = useMemo(() => {
    if (!filters) {
      return undefined;
    }
    return {
      page,
      pageSize: PAGE_SIZE,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      ...(filters.status !== 'all' ? { status: filters.status } : {}),
      ...(filters.type !== 'all' ? { type: filters.type } : {}),
      ...(filters.paymentMethod !== 'all' ? { paymentMethod: filters.paymentMethod } : {}),
      ...(filters.q.trim().length > 0 ? { q: filters.q.trim() } : {}),
    };
  }, [page, filters]);

  const skipList =
    !branchId ||
    branchContext.isError ||
    branchContext.isLoading ||
    referenceBusinessDate === null ||
    listQuery === undefined;

  const { data, isLoading, isError, isFetching, refetch } = useListOrdersQuery(
    { branchId: branchId ?? '', query: listQuery },
    { skip: skipList },
  );

  // Keep the previous rows on screen while the next page (or a realtime refetch) is in flight.
  const lastItemsRef = useRef<OrderListItem[]>([]);
  if (data) {
    lastItemsRef.current = data.items;
  }
  const items = useMemo(
    () => (data ? data.items : isFetching ? lastItemsRef.current : []),
    [data, isFetching],
  );

  const onRealtimeEvent = useCallback(
    (_event: RealtimeEvent) => {
      if (
        filters &&
        referenceBusinessDate &&
        periodIncludesReferenceDay(filters, referenceBusinessDate)
      ) {
        dispatch(baseApi.util.invalidateTags([{ type: 'Order', id: 'LIST' }]));
      }
    },
    [dispatch, filters, referenceBusinessDate],
  );

  useBranchRealtime({
    branchId,
    onEvent: onRealtimeEvent,
    onResync: () => {
      dispatch(baseApi.util.invalidateTags(['Order']));
    },
  });

  const uiLocale = intlLocaleForUi(i18n.language);
  const timezone = branchContext.timezone ?? 'UTC';

  const updateFilters = useCallback(
    (patch: Partial<DashboardOrdersFilters>) => {
      if (!filters) {
        return;
      }
      const next = { ...filters, ...patch };
      const patchKeys = Object.keys(patch);
      const qOnly = patchKeys.length === 1 && patchKeys[0] === 'q';
      setSearchParams(
        dashboardOrdersFiltersToSearchParams(next),
        qOnly ? { replace: true } : undefined,
      );
    },
    [filters, setSearchParams],
  );

  const rows = useMemo(() => {
    const takeawayLabel = t('dashboard.orders.takeaway');
    return items.map((order) => ({
      id: order.id,
      orderNumber: String(order.orderNumber),
      dateTimeLabel: new Intl.DateTimeFormat(intlLocaleForUi(uiLocale), {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: timezone,
      }).format(new Date(order.createdAt)),
      typeTable: orderTypeTableLabel({
        type: order.type,
        tableLabel: order.tableLabel,
        customerName: order.customerName,
        takeawayLabel,
      }),
      itemCount: String(order.itemCount),
      totalLabel: orderMoneyFormatter(order, uiLocale)(order.totalMinor, 'total'),
      statusTone: orderStatusBadgeTone(order.status),
      statusLabel: t(`dashboard.orders.status.${order.status}`),
      paymentLabel: t(`dashboard.orders.paymentStatus.${order.paymentStatus}`),
      paymentMethodsLabel: order.paymentMethods
        .map((m) => t(`dashboard.orders.paymentMethod.${m}`))
        .join(', '),
      onSelect: () => {
        void navigate(
          `/dashboard/orders/${order.id}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`,
          {
            state: { listSearch: searchParams.toString() },
          },
        );
      },
    }));
  }, [items, navigate, searchParams, t, timezone, uiLocale]);

  const setPeriod = (period: DashboardOrdersPeriod) => {
    updateFilters({ period });
  };

  const filterAllLabel = t('dashboard.orders.filters.all');

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: filterAllLabel },
      ...(
        ['draft', 'placed', 'preparing', 'ready', 'completed', 'cancelled', 'refunded'] as const
      ).map((s) => ({
        value: s,
        label: t(`dashboard.orders.status.${s}`),
      })),
    ],
    [filterAllLabel, t],
  );

  // Only offer the types this branch supports, but keep an already-selected one so it can be cleared.
  const typeOptions = useMemo(
    () => [
      { value: 'all', label: filterAllLabel },
      ...(supportsDineIn || filters?.type === 'dine_in'
        ? [{ value: 'dine_in', label: t('dashboard.orders.orderType.dine_in') }]
        : []),
      ...(supportsTakeaway || filters?.type === 'takeaway'
        ? [{ value: 'takeaway', label: t('dashboard.orders.orderType.takeaway') }]
        : []),
    ],
    [filterAllLabel, filters?.type, supportsDineIn, supportsTakeaway, t],
  );

  const paymentMethodOptions = useMemo(
    () => [
      { value: 'all', label: filterAllLabel },
      ...(['cash', 'card', 'other'] as const).map((m) => ({
        value: m,
        label: t(`dashboard.orders.paymentMethod.${m}`),
      })),
    ],
    [filterAllLabel, t],
  );

  return {
    orgSwitcher,
    searchInputKey: branchId ?? '',
    branchContextError: branchContext.isError,
    branchContextLoading: branchContext.isLoading,
    filters,
    search: {
      value: filters?.q ?? '',
      onChange: (value: string) => {
        updateFilters({ q: value });
      },
      placeholder: t('dashboard.orders.searchPlaceholder'),
      clearLabel: t('dashboard.orders.searchClear'),
    },
    status: {
      value: filters?.status ?? 'all',
      onChange: (value: string) => {
        updateFilters({
          status: value === 'all' ? 'all' : (value as DashboardOrdersFilters['status']),
        });
      },
    },
    type: {
      value: filters?.type ?? 'all',
      onChange: (value: string) => {
        updateFilters({
          type: value === 'all' ? 'all' : (value as DashboardOrdersFilters['type']),
        });
      },
    },
    paymentMethod: {
      value: filters?.paymentMethod ?? 'all',
      onChange: (value: string) => {
        updateFilters({
          paymentMethod:
            value === 'all' ? 'all' : (value as DashboardOrdersFilters['paymentMethod']),
        });
      },
    },
    statusOptions,
    typeOptions,
    paymentMethodOptions,
    dateLocale: i18n.language,
    period: {
      value: filters?.period ?? 'today',
      onChange: setPeriod,
      customFrom: filters?.dateFrom ?? '',
      customTo: filters?.dateTo ?? '',
      onCustomFromChange: (value: string) => {
        updateFilters({ period: 'custom', dateFrom: value, dateTo: filters?.dateTo ?? value });
      },
      onCustomToChange: (value: string) => {
        updateFilters({ period: 'custom', dateTo: value, dateFrom: filters?.dateFrom ?? value });
      },
    },
    rows,
    showEmptyState:
      items.length === 0 &&
      !branchContext.isLoading &&
      !isError &&
      !(skipList ? false : isLoading || isFetching),
    isLoading:
      branchContext.isLoading ||
      (skipList ? false : isLoading && items.length === 0),
    isError: branchContext.isError || isError,
    isFetching,
    pagination: {
      page,
      pageCount: pageCountOf(data?.total, data?.pageSize),
      onPageChange: setPage,
      labels: listPaginationLabels(t),
    },
    onRetry: () => {
      void refetch();
      void branchContext.refetch();
    },
    labels: {
      title: t('dashboard.orders.title'),
      showingRecords: t('dashboard.orders.showingRecords', { n: data?.total ?? 0 }),
      loading: t('common.loading'),
      retry: t('pos.retry'),
      empty: t('dashboard.orders.empty'),
      error: t('dashboard.orders.error'),
      branchDateError: t('dashboard.orders.branchDateError'),
      status: t('dashboard.orders.filters.status'),
      type: t('dashboard.orders.filters.type'),
      payment: t('dashboard.orders.filters.payment'),
      period: t('dashboard.orders.filters.period'),
      periodToday: t('dashboard.orders.filters.periodToday'),
      periodYesterday: t('dashboard.orders.filters.periodYesterday'),
      periodLast7: t('dashboard.orders.filters.periodLast7'),
      periodLast30: t('dashboard.orders.filters.periodLast30'),
      periodCustom: t('dashboard.orders.filters.periodCustom'),
      from: t('dashboard.orders.filters.from'),
      to: t('dashboard.orders.filters.to'),
      colNumber: t('dashboard.orders.columns.number'),
      colDateTime: t('dashboard.orders.columns.dateTime'),
      colCustomer: t('dashboard.orders.columns.customer'),
      colItems: t('dashboard.orders.columns.items'),
      colTotal: t('dashboard.orders.columns.total'),
      colStatus: t('dashboard.orders.columns.status'),
      colPayment: t('dashboard.orders.columns.payment'),
      tableSortBy: t('dashboard.orders.columns.sortBy'),
      tableRowActions: t('dashboard.orders.columns.rowActions'),
    },
  };
}

export type DashboardOrdersPageViewModel = ReturnType<typeof useDashboardOrdersPage>;
