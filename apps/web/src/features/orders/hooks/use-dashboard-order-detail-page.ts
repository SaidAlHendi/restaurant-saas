import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';

import { pickLocalizedText } from '@app/shared';

import { useAppSelector } from '../../../app/hooks.js';
import { intlLocaleForUi } from '../../../lib/money.js';
import { selectCurrentBranchId, selectSessionOrg } from '../../session/session.selectors.js';
import {
  mapOrderEventToTimelineRow,
  sortEventsChronological,
} from '../order-event-timeline.utils.js';
import { orderTypeTableLabel } from '../order-type-table-label.utils.js';
import { formatOrderMoney, orderStatusBadgeTone } from '../orders-display.utils.js';
import { isOrderNotFoundError } from '../orders-api-errors.js';
import { useGetOrderQuery, useListOrderEventsQuery } from '../orders.api.js';
import { useOrgSwitcher } from './use-org-switcher.js';

export function useDashboardOrderDetailPage() {
  const { t, i18n } = useTranslation();
  const { orderId = '' } = useParams();
  const location = useLocation();
  const branchId = useAppSelector(selectCurrentBranchId);
  const org = useAppSelector(selectSessionOrg);
  const orgSwitcher = useOrgSwitcher();
  const uiLocale = intlLocaleForUi(i18n.language);
  const contentLocale = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const defaultLocale = org?.defaultLocale ?? 'en';

  const listSearch =
    typeof location.state === 'object' &&
    location.state !== null &&
    'listSearch' in location.state &&
    typeof (location.state as { listSearch: unknown }).listSearch === 'string'
      ? (location.state as { listSearch: string }).listSearch
      : '';

  const backHref = listSearch.length > 0 ? `/dashboard/orders?${listSearch}` : '/dashboard/orders';

  const orderQuery = useGetOrderQuery(
    { branchId: branchId ?? '', orderId },
    { skip: !branchId || orderId.length === 0 },
  );
  const eventsQuery = useListOrderEventsQuery(
    { branchId: branchId ?? '', orderId },
    { skip: !branchId || orderId.length === 0 },
  );

  const order = orderQuery.data;
  const currency = order?.currency ?? org?.defaultCurrency ?? 'SAR';

  const formatMinor = useCallback(
    (minor: number) => formatOrderMoney(minor, currency, uiLocale),
    [currency, uiLocale],
  );

  const timeline = useMemo(() => {
    const sorted = sortEventsChronological(eventsQuery.data?.items ?? []);
    return sorted.map((event) => {
      const row = mapOrderEventToTimelineRow(event);
      return {
        id: row.id,
        icon: row.icon,
        label: t(row.labelKey, row.labelParams),
        actorName: row.actorName,
        approverName: row.approverName,
        timeLabel: new Intl.DateTimeFormat(uiLocale, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(row.timeIso)),
      };
    });
  }, [eventsQuery.data?.items, t, uiLocale]);

  const items = useMemo(() => {
    if (!order) {
      return [];
    }
    return order.items.map((item) => ({
      id: item.id,
      name: pickLocalizedText(item.productNameSnapshot, contentLocale, defaultLocale),
      quantity: String(item.quantity),
      lineTotal: formatMinor(item.lineTotalMinor),
      notes: item.notes,
      voided: item.status === 'voided',
      voidReason: item.voidReason,
      isAddition: item.isAddition,
      modifiers: item.modifiers.map((m) =>
        pickLocalizedText(m.nameSnapshot, contentLocale, defaultLocale),
      ),
    }));
  }, [contentLocale, defaultLocale, formatMinor, order]);

  const notFound = orderQuery.isError && isOrderNotFoundError(orderQuery.error);

  return {
    orgSwitcher,
    backLink: {
      to: backHref,
      label: t('dashboard.orderDetail.back'),
    },
    isLoading: orderQuery.isLoading || eventsQuery.isLoading,
    notFound,
    order: order
      ? {
          number: String(order.orderNumber),
          businessDate: order.businessDate,
          statusTone: orderStatusBadgeTone(order.status),
          statusLabel: t(`dashboard.orders.status.${order.status}`),
          paymentLabel: t(`dashboard.orders.paymentStatus.${order.paymentStatus}`),
          typeTable: orderTypeTableLabel({
            type: order.type,
            tableLabel: null,
            customerName: order.customerName,
            takeawayLabel: t('dashboard.orders.takeaway'),
          }),
          placedAt: order.placedAt
            ? new Intl.DateTimeFormat(uiLocale, { dateStyle: 'medium', timeStyle: 'short' }).format(
                new Date(order.placedAt),
              )
            : null,
          completedAt: order.completedAt
            ? new Intl.DateTimeFormat(uiLocale, { dateStyle: 'medium', timeStyle: 'short' }).format(
                new Date(order.completedAt),
              )
            : null,
          cancelledAt: order.cancelledAt
            ? new Intl.DateTimeFormat(uiLocale, { dateStyle: 'medium', timeStyle: 'short' }).format(
                new Date(order.cancelledAt),
              )
            : null,
          cancelReason: order.cancelReason,
          totals: {
            subtotal: formatMinor(order.subtotalMinor),
            tax: formatMinor(order.taxMinor),
            total: formatMinor(order.totalMinor),
            paid: formatMinor(order.paidMinor),
            due: formatMinor(order.dueMinor),
          },
        }
      : null,
    items,
    payments: (order?.payments ?? []).map((p) => ({
      id: p.id,
      method: t(`dashboard.orders.paymentMethod.${p.method}`),
      amount: formatMinor(p.amountMinor),
      time: new Intl.DateTimeFormat(uiLocale, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(p.createdAt),
      ),
    })),
    timeline,
    labels: {
      title: t('dashboard.orderDetail.title'),
      items: t('dashboard.orderDetail.items'),
      payments: t('dashboard.orderDetail.payments'),
      timeline: t('dashboard.orderDetail.timeline'),
      notFound: t('dashboard.orderDetail.notFound'),
      loading: t('common.loading'),
      voidReason: t('dashboard.orderDetail.voidReason'),
      addition: t('dashboard.orderDetail.addition'),
      actor: t('dashboard.orderDetail.actor'),
      approvedBy: t('dashboard.orderDetail.approvedBy'),
      subtotal: t('dashboard.orderDetail.subtotal'),
      tax: t('dashboard.orderDetail.tax'),
      total: t('dashboard.orderDetail.total'),
      paid: t('dashboard.orderDetail.paid'),
      due: t('dashboard.orderDetail.due'),
    },
  };
}

export type DashboardOrderDetailPageViewModel = ReturnType<typeof useDashboardOrderDetailPage>;
