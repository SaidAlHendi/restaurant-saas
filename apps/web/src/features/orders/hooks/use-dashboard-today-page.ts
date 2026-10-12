import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { pickLocalizedText } from '@app/shared';

import { baseApi } from '../../../app/api/base-api.js';
import { useAppDispatch, useAppSelector } from '../../../app/hooks.js';
import { intlLocaleForUi } from '../../../lib/money.js';
import type { RealtimeEvent } from '../../../lib/realtime.js';
import { useGetDailyReportQuery } from '../../reports/reports.api.js';
import { useBranchRealtime } from '../../realtime/use-branch-realtime.js';
import { selectCurrentBranchId, selectSessionOrg } from '../../session/session.selectors.js';
import { addCalendarDays } from '../dashboard-orders-filters.utils.js';
import { barWidthPercent } from '../report-bars.utils.js';
import { formatOrderMoney } from '../orders-display.utils.js';
import { useOrgSwitcher } from './use-org-switcher.js';
import { useBranchBusinessDate } from './use-branch-business-date.js';

export function useDashboardTodayPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const branchId = useAppSelector(selectCurrentBranchId);
  const org = useAppSelector(selectSessionOrg);
  const orgSwitcher = useOrgSwitcher();
  const branchContext = useBranchBusinessDate(branchId);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (branchContext.businessDate !== null) {
      setSelectedDate(branchContext.businessDate);
    }
  }, [branchContext.businessDate, branchId]);

  const activeDate = selectedDate ?? branchContext.businessDate ?? undefined;

  const { data, isLoading, isError, refetch } = useGetDailyReportQuery(
    { branchId: branchId ?? '', businessDate: activeDate },
    { skip: !branchId || activeDate === undefined },
  );

  const onRealtimeEvent = useCallback(
    (_event: RealtimeEvent) => {
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
    selectedDate: activeDate ?? '',
    onSelectToday: () => {
      if (referenceToday) {
        setSelectedDate(referenceToday);
      }
    },
    onSelectYesterday: () => {
      if (referenceToday) {
        setSelectedDate(addCalendarDays(referenceToday, -1));
      }
    },
    onDateInputChange: (value: string) => {
      setSelectedDate(value);
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
    timezone,
    labels: {
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
