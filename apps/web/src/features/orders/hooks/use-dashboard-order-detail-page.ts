import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';

import { useAppSelector } from '../../../app/hooks.js';
import { intlLocaleForUi } from '../../../lib/money.js';
import { selectCurrentBranchId, selectSessionOrg } from '../../session/session.selectors.js';
import { orderDetailsBodyLabels } from '../components/order-details/order-details.labels.js';
import { buildOrderDetailsModel } from '../components/order-details/order-details.model.js';
import { moneyFormatter } from '../../../lib/money.js';
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

  // The display currency frozen on this order, so old orders keep the amounts they were sold at.
  const formatMinor = useMemo(
    () => moneyFormatter(currency, uiLocale, order?.display),
    [currency, order?.display, uiLocale],
  );

  const details = useMemo(
    () =>
      order
        ? buildOrderDetailsModel({
            order,
            events: eventsQuery.data?.items,
            eventsError: eventsQuery.isError,
            t,
            uiLocale: i18n.language,
            intlLocale: uiLocale,
            contentLocale,
            defaultLocale,
            formatMinor,
            tableLabel: null,
            showVersion: true,
          })
        : null,
    [contentLocale, defaultLocale, eventsQuery.data?.items, eventsQuery.isError, formatMinor, i18n.language, order, t, uiLocale],
  );

  const notFound = orderQuery.isError && isOrderNotFoundError(orderQuery.error);

  return {
    orgSwitcher,
    backLink: {
      to: backHref,
      label: t('dashboard.orderDetail.back'),
    },
    isLoading: orderQuery.isLoading,
    eventsLoading: eventsQuery.isLoading,
    notFound,
    details,
    labels: {
      ...orderDetailsBodyLabels(t),
      title: t('dashboard.orderDetail.title'),
      notFound: t('dashboard.orderDetail.notFound'),
      loading: t('common.loading'),
      orderNumber: order ? t('orderDetails.orderNumber', { number: order.orderNumber }) : '',
      progress: t('orderDetails.progress'),
      business: t('orderDetails.businessDate'),
      created: t('orderDetails.createdAt'),
      dueLabel: t('orderDetails.totals.due'),
    },
  };
}

export type DashboardOrderDetailPageViewModel = ReturnType<typeof useDashboardOrderDetailPage>;
