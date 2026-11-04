import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { businessDateSchema, pickLocalizedText } from '@app/shared';

import { baseApi } from '../../../app/api/base-api.js';
import { useAppDispatch, useAppSelector } from '../../../app/hooks.js';
import { intlLocaleForUi } from '../../../lib/money.js';
import type { RealtimeEvent } from '../../../lib/realtime.js';
import { useGetDailyReportQuery } from '../../reports/reports.api.js';
import { useNavigate } from 'react-router-dom';
import { useBranchRealtime } from '../../realtime/use-branch-realtime.js';
import { selectCurrentBranchId, selectSessionOrg } from '../../session/session.selectors.js';
import { addCalendarDays } from '../dashboard-orders-filters.utils.js';
import { barWidthPercent } from '../report-bars.utils.js';
import { orderTypeTableLabel } from '../order-type-table-label.utils.js';
import { liveCounts, oldestOpenMinutes, percentDelta } from '../dashboard-overview.utils.js';
import { formatOrderMoney, orderStatusBadgeTone } from '../orders-display.utils.js';
import { useListOrdersQuery } from '../orders.api.js';
import { useOrgSwitcher } from './use-org-switcher.js';
import { useBranchBusinessDate } from './use-branch-business-date.js';

export function useDashboardTodayPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const branchId = useAppSelector(selectCurrentBranchId);
  const org = useAppSelector(selectSessionOrg);
  const orgSwitcher = useOrgSwitcher();
  const branchContext = useBranchBusinessDate(branchId);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const lastValidDateRef = useRef<string | null>(null);

  useEffect(() => {
    if (branchContext.businessDate !== null) {
      setSelectedDate(branchContext.businessDate);
      lastValidDateRef.current = branchContext.businessDate;
    }
  }, [branchContext.businessDate, branchId]);

  const activeDate =
    selectedDate !== null && businessDateSchema.safeParse(selectedDate).success
      ? selectedDate
      : (branchContext.businessDate ?? undefined);

  const { data, isLoading, isError, refetch } = useGetDailyReportQuery(
    { branchId: branchId ?? '', businessDate: activeDate },
    { skip: !branchId || activeDate === undefined },
  );

  const previousDate = activeDate === undefined ? undefined : addCalendarDays(activeDate, -1);
  const previous = useGetDailyReportQuery(
    { branchId: branchId ?? '', businessDate: previousDate },
    { skip: !branchId || previousDate === undefined },
  );
  const activeOrders = useListOrdersQuery(
    { branchId: branchId ?? '', query: { activeOnly: true, limit: 50 } },
    { skip: !branchId },
  );
  const recentOrders = useListOrdersQuery(
    { branchId: branchId ?? '', query: { todayOnly: true, limit: 5 } },
    { skip: !branchId },
  );

  const onRealtimeEvent = useCallback(
    (_event: RealtimeEvent) => {
      dispatch(baseApi.util.invalidateTags([{ type: 'Order', id: 'LIST' }]));
      if (
        branchContext.businessDate !== null &&
        activeDate === branchContext.businessDate
      ) {
        dispatch(
          baseApi.util.invalidateTags([
            { type: 'DailyReport', id: `${branchId ?? ''}:default` },
            { type: 'DailyReport', id: `${branchId ?? ''}:${activeDate}` },
          ]),
        );
      }
    },
    [activeDate, branchContext.businessDate, branchId, dispatch],
  );

  useBranchRealtime({
    branchId,
    onEvent: onRealtimeEvent,
    onResync: () => {
      void refetch();
    },
  });

  const uiLocale = intlLocaleForUi(i18n.language);
  const contentLocale = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const defaultLocale = org?.defaultLocale ?? 'en';
  const currency = data?.currency ?? branchContext.currency ?? 'SAR';
  const timezone = data?.timezone ?? branchContext.timezone ?? 'UTC';

  const formatMinor = useCallback(
    (minor: number) => formatOrderMoney(minor, currency, uiLocale),
    [currency, uiLocale],
  );

  const paymentTotal = useMemo(
    () => data?.byPaymentMethod.reduce((s, row) => s + row.amountMinor, 0) ?? 0,
    [data?.byPaymentMethod],
  );

  const typeTotal = useMemo(
    () => data?.byType.reduce((s, row) => s + row.salesMinor, 0) ?? 0,
    [data?.byType],
  );

  const referenceToday = branchContext.businessDate;

  return {
    orgSwitcher,
    branchContextError: branchContext.isError,
    branchContextLoading: branchContext.isLoading,
    isLoading: branchContext.isLoading || isLoading,
    isError: branchContext.isError || isError,
    onRetry: () => {
      void refetch();
      void branchContext.refetch();
    },
    selectedDate: activeDate ?? lastValidDateRef.current ?? '',
    onSelectToday: () => {
      if (referenceToday) {
        setSelectedDate(referenceToday);
        lastValidDateRef.current = referenceToday;
      }
    },
    onSelectYesterday: () => {
      if (referenceToday) {
        const yesterday = addCalendarDays(referenceToday, -1);
        setSelectedDate(yesterday);
        lastValidDateRef.current = yesterday;
      }
    },
    onDateInputChange: (value: string) => {
      if (value.length === 0) {
        return;
      }
      const parsed = businessDateSchema.safeParse(value);
      if (!parsed.success) {
        return;
      }
      setSelectedDate(parsed.data);
      lastValidDateRef.current = parsed.data;
    },
    stats: data
      ? {
          sales: formatMinor(data.salesMinor),
          orders: String(data.ordersCount),
          averageTicket: formatMinor(data.averageTicketMinor),
          unpaid: formatMinor(data.unpaidMinor),
          cancelled: String(data.cancelledCount),
        }
      : null,
    paymentBars: (data?.byPaymentMethod ?? []).map((row) => ({
      id: row.method,
      label: t(`dashboard.today.paymentMethod.${row.method}`),
      amountLabel: formatMinor(row.amountMinor),
      widthPct: String(barWidthPercent(row.amountMinor, paymentTotal)),
    })),
    typeBars: (data?.byType ?? []).map((row) => ({
      id: row.type,
      label: t(`dashboard.today.orderType.${row.type}`),
      amountLabel: formatMinor(row.salesMinor),
      widthPct: String(barWidthPercent(row.salesMinor, typeTotal)),
    })),
    topItems: (data?.topItems ?? []).map((row) => ({
      id: row.productId,
      name: pickLocalizedText(row.nameSnapshot, contentLocale, defaultLocale),
      quantity: String(row.quantity),
      revenue: formatMinor(row.revenueMinor),
    })),
    deltas: data
      ? {
          sales: percentDelta(data.salesMinor, previous.data?.salesMinor),
          orders: percentDelta(data.ordersCount, previous.data?.ordersCount),
          averageTicket: percentDelta(data.averageTicketMinor, previous.data?.averageTicketMinor),
        }
      : null,
    live: (() => {
      const items = activeOrders.data?.items ?? [];
      const counts = liveCounts(items);
      const oldest = oldestOpenMinutes(items, new Date());
      return {
        open: String(counts.open),
        waiting: String(counts.waiting),
        ready: String(counts.ready),
        oldest: oldest === null ? '-' : t('dashboard.overview.minutes', { count: oldest }),
        onOpenKitchen: () => {
          void navigate('/kds');
        },
      };
    })(),
    recentRows: (recentOrders.data?.items ?? []).map((order) => ({
      id: order.id,
      number: `#${String(order.orderNumber)}`,
      time: new Intl.DateTimeFormat(uiLocale, {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone,
      }).format(new Date(order.createdAt)),
      where: orderTypeTableLabel({
        type: order.type,
        tableLabel: order.tableLabel,
        customerName: order.customerName,
        takeawayLabel: t('dashboard.today.orderType.takeaway'),
      }),
      items: t('dashboard.overview.items', { count: order.itemCount }),
      total: formatMinor(order.totalMinor),
      status: orderStatusBadgeTone(order.status),
      statusLabel: t(`dashboard.orders.status.${order.status}`),
      onOpen: () => {
        void navigate(`/dashboard/orders/${order.id}`);
      },
    })),
    onViewAllOrders: () => {
      void navigate('/dashboard/orders');
    },
    timezone,
    labels: {
      kpiHint: t('dashboard.overview.vsPrevious'),
      salesBreakdown: t('dashboard.overview.salesBreakdown'),
      salesBreakdownHint: t('dashboard.overview.salesBreakdownHint'),
      liveOps: t('dashboard.overview.liveOps'),
      liveOpsHint: t('dashboard.overview.liveOpsHint'),
      livePill: t('dashboard.overview.live'),
      openOrders: t('dashboard.overview.openOrders'),
      openOrdersHint: t('dashboard.overview.openOrdersHint'),
      waiting: t('dashboard.overview.waiting'),
      waitingHint: t('dashboard.overview.waitingHint'),
      readyOrders: t('dashboard.overview.readyOrders'),
      readyHint: t('dashboard.overview.readyHint'),
      oldest: t('dashboard.overview.oldest'),
      oldestHint: t('dashboard.overview.oldestHint'),
      openKitchen: t('dashboard.overview.openKitchen'),
      recent: t('dashboard.overview.recent'),
      recentHint: t('dashboard.overview.recentHint'),
      viewAll: t('dashboard.overview.viewAll'),
      colOrder: t('dashboard.overview.colOrder'),
      colTime: t('dashboard.overview.colTime'),
      colWhere: t('dashboard.overview.colWhere'),
      colItems: t('dashboard.overview.colItems'),
      colAmount: t('dashboard.overview.colAmount'),
      colStatus: t('dashboard.overview.colStatus'),
      noRecent: t('dashboard.overview.noRecent'),
      popular: t('dashboard.overview.popular'),
      popularHint: t('dashboard.overview.popularHint'),
      title: t('dashboard.today.title'),
      pickToday: t('dashboard.today.pickToday'),
      pickYesterday: t('dashboard.today.pickYesterday'),
      dateLabel: t('dashboard.today.dateLabel'),
      sales: t('dashboard.today.sales'),
      orders: t('dashboard.today.orders'),
      averageTicket: t('dashboard.today.averageTicket'),
      unpaid: t('dashboard.today.unpaid'),
      cancelled: t('dashboard.today.cancelled'),
      paymentBreakdown: t('dashboard.today.paymentBreakdown'),
      typeBreakdown: t('dashboard.today.typeBreakdown'),
      topItems: t('dashboard.today.topItems'),
      topItemsName: t('dashboard.today.topItemsName'),
      topItemsQty: t('dashboard.today.topItemsQty'),
      topItemsRevenue: t('dashboard.today.topItemsRevenue'),
      empty: t('dashboard.today.empty'),
      error: t('dashboard.today.error'),
      loading: t('common.loading'),
      retry: t('pos.retry'),
    },
  };
}

export type DashboardTodayPageViewModel = ReturnType<typeof useDashboardTodayPage>;
