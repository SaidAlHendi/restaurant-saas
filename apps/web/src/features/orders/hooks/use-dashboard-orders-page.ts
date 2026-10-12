import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { OrderListItem } from '@app/shared';

import { baseApi } from '../../../app/api/base-api.js';
import { useAppDispatch, useAppSelector } from '../../../app/hooks.js';
import { intlLocaleForUi } from '../../../lib/money.js';
import type { RealtimeEvent } from '../../../lib/realtime.js';
import { useBranchRealtime } from '../../realtime/use-branch-realtime.js';
import { selectCurrentBranchId, selectSessionOrg } from '../../session/session.selectors.js';
import {
  dashboardOrdersFiltersToSearchParams,
  parseDashboardOrdersFilters,
  periodIncludesReferenceDay,
  type DashboardOrdersFilters,
  type DashboardOrdersPeriod,
} from '../dashboard-orders-filters.utils.js';
import { orderTypeTableLabel } from '../order-type-table-label.utils.js';
import { formatOrderMoney, orderStatusBadgeTone } from '../orders-display.utils.js';
import { useListOrdersQuery } from '../orders.api.js';
import { useBranchBusinessDate } from './use-branch-business-date.js';
import { useOrgSwitcher } from './use-org-switcher.js';

const PAGE_SIZE = 20;

export function useDashboardOrdersPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const branchId = useAppSelector(selectCurrentBranchId);
  const org = useAppSelector(selectSessionOrg);
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

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [accumulated, setAccumulated] = useState<OrderListItem[]>([]);

  useEffect(() => {
    setCursor(undefined);
    setAccumulated([]);
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
      limit: PAGE_SIZE,
      cursor,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      ...(filters.status !== 'all' ? { status: filters.status } : {}),
      ...(filters.type !== 'all' ? { type: filters.type } : {}),
      ...(filters.paymentMethod !== 'all' ? { paymentMethod: filters.paymentMethod } : {}),
      ...(filters.q.trim().length > 0 ? { q: filters.q.trim() } : {}),
    };
  }, [cursor, filters]);

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

  useEffect(() => {
    if (!data) {
      return;
    }
    if (cursor === undefined) {
      setAccumulated((prev) => {
        if (data.items.length === 0 && prev.length > 0 && isFetching) {
          return prev;
        }
        return data.items;
      });
      return;
    }
    setAccumulated((prev) => {
      const ids = new Set(prev.map((row) => row.id));
      const next = data.items.filter((row) => !ids.has(row.id));
      return [...prev, ...next];
    });
  }, [cursor, data, isFetching]);

  const resetPagination = useCallback(() => {
    setCursor(undefined);
  }, []);

  const onRealtimeEvent = useCallback(
    (_event: RealtimeEvent) => {
      if (
        filters &&
        referenceBusinessDate &&
        periodIncludesReferenceDay(filters, referenceBusinessDate)
      ) {
        resetPagination();
        dispatch(baseApi.util.invalidateTags([{ type: 'Order', id: 'LIST' }]));
      }
    },
    [dispatch, filters, referenceBusinessDate, resetPagination],
  );

  useBranchRealtime({
    branchId,
    onEvent: onRealtimeEvent,
    onResync: () => {
      resetPagination();
      dispatch(baseApi.util.invalidateTags(['Order']));
    },
  });

  const uiLocale = intlLocaleForUi(i18n.language);
  const currency = data?.items[0]?.currency ?? org?.defaultCurrency ?? 'SAR';
  const timezone = branchContext.timezone ?? 'UTC';

  const formatMinor = useCallback(
    (minor: number) => formatOrderMoney(minor, currency, uiLocale),
    [currency, uiLocale],
  );

  const updateFilters = useCallback(
    (patch: Partial<DashboardOrdersFilters>) => {
      if (!filters) {
        return;
      }
      const next = { ...filters, ...patch };
      const patchKeys = Object.keys(patch);
      const qOnly = patchKeys.length === 1 && patchKeys[0] === 'q';
      setSearchParams(dashboardOrdersFiltersToSearchParams(next), qOnly ? { replace: true } : undefined);
    },
    [filters, setSearchParams],
  );

  const rows = useMemo(() => {
    const takeawayLabel = t('dashboard.orders.takeaway');
    return accumulated.map((order) => ({
      id: order.id,
      orderNumber: String(order.orderNumber),
      dateTimeLabel: new Intl.DateTimeFormat(uiLocale, {
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
      totalLabel: formatMinor(order.totalMinor),
      statusTone: orderStatusBadgeTone(order.status),
      statusLabel: t(`dashboard.orders.status.${order.status}`),
      paymentLabel: t(`dashboard.orders.paymentStatus.${order.paymentStatus}`),
      paymentMethodsLabel: order.paymentMethods
        .map((m) => t(`dashboard.orders.paymentMethod.${m}`))
        .join(', '),
      onSelect: () => {
        void navigate(`/dashboard/orders/${order.id}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`, {
          state: { listSearch: searchParams.toString() },
        });
      },
    }));
  }, [accumulated, formatMinor, navigate, searchParams, t, timezone, uiLocale]);

  const setPeriod = (period: DashboardOrdersPeriod) => {
    updateFilters({ period });
  };

  const filterAllLabel = t('dashboard.orders.filters.all');

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: filterAllLabel },
      ...(
        [
          'draft',
          'placed',
          'preparing',
          'ready',
          'completed',
          'cancelled',
          'refunded',
        ] as const
      ).map((s) => ({
        value: s,
        label: t(`dashboard.orders.status.${s}`),
      })),
    ],
    [filterAllLabel, t],
  );

  const typeOptions = useMemo(
    () => [
      { value: 'all', label: filterAllLabel },
      { value: 'dine_in', label: t('dashboard.orders.orderType.dine_in') },
      { value: 'takeaway', label: t('dashboard.orders.orderType.takeaway') },
    ],
    [filterAllLabel, t],
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
      accumulated.length === 0 &&
      !branchContext.isLoading &&
      !isError &&
      !(skipList ? false : (isLoading || isFetching) && cursor === undefined),
    isLoading:
      branchContext.isLoading ||
      (skipList ? false : isLoading && cursor === undefined && accumulated.length === 0),
    isError: branchContext.isError || isError,
    isFetching,
    loadMore:
      data?.nextCursor !== null && data?.nextCursor !== undefined
        ? {
            label: t('dashboard.orders.loadMore'),
            loading: isFetching,
            onClick: () => {
              setCursor(data.nextCursor ?? undefined);
            },
          }
        : null,
    onRetry: () => {
      void refetch();
      void branchContext.refetch();
    },
    labels: {
      title: t('dashboard.orders.title'),
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
