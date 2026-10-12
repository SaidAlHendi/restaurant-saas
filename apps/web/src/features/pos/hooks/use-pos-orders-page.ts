import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { toast } from '@app/ui';
import type { OrderListItem } from '@app/shared';

import { baseApi } from '../../../app/api/base-api.js';
import { useAppDispatch, useAppSelector } from '../../../app/hooks.js';
import { intlLocaleForUi } from '../../../lib/money.js';
import type { RealtimeEvent } from '../../../lib/realtime.js';
import { useListOrdersQuery } from '../../orders/orders.api.js';
import { useBranchRealtime } from '../../realtime/use-branch-realtime.js';
import {
  selectCan,
  selectCurrentBranchId,
  selectSessionOrg,
} from '../../session/session.selectors.js';
import { useListDiningTablesQuery } from '../../tables/tables.api.js';
import { posOrderTagsForEvent } from '../pos-realtime.utils.js';
import {
  mergeListQueryWithSearch,
  orderTypeTableLabel,
  parsePosOrdersTab,
  POS_ORDERS_TABS,
  tabToListQuery,
  type PosOrdersTab,
} from '../pos-orders-list.utils.js';
import { posOrderStatusTone } from '../pos-catalog.utils.js';
import { useGetPosMenuQuery } from '../pos.api.js';
import { usePosOrderDetail } from './use-pos-order-detail.js';
import { usePosPaymentDialog } from './use-pos-payment-dialog.js';

const PAGE_SIZE = 20;

export function usePosOrdersPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const branchId = useAppSelector(selectCurrentBranchId);
  const org = useAppSelector(selectSessionOrg);
  const canCancelOrders = useAppSelector(selectCan('orders.cancel'));
  const canCreateOrders = useAppSelector(selectCan('orders.create'));

  const tab = parsePosOrdersTab(searchParams.get('tab'));
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [accumulated, setAccumulated] = useState<OrderListItem[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQ(searchInput.trim());
      setCursor(undefined);
    }, 300);
    return () => {
      window.clearTimeout(handle);
    };
  }, [searchInput]);

  useEffect(() => {
    setCursor(undefined);
    setAccumulated([]);
  }, [tab, branchId, debouncedQ]);

  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const uiLocale = intlLocaleForUi(i18n.language);
  const defaultLocale = org?.defaultLocale ?? 'en';

  const listQuery = useMemo(
    () => mergeListQueryWithSearch(tabToListQuery(tab, PAGE_SIZE), debouncedQ),
    [tab, debouncedQ],
  );

  const { data, isLoading, isError, isFetching, refetch } = useListOrdersQuery(
    { branchId: branchId ?? '', query: { ...listQuery, cursor } },
    { skip: !branchId },
  );

  useEffect(() => {
    if (!data) {
      return;
    }
    if (cursor === undefined) {
      setAccumulated(data.items);
      return;
    }
    setAccumulated((prev) => {
      const ids = new Set(prev.map((row) => row.id));
      const next = data.items.filter((row) => !ids.has(row.id));
      return [...prev, ...next];
    });
  }, [cursor, data]);

  const onRealtimeEvent = useCallback(
    ({ payload }: RealtimeEvent) => {
      if (!branchId || payload.branchId !== branchId) {
        return;
      }
      const tags = posOrderTagsForEvent([], payload, branchId);
      if (tags.length > 0) {
        dispatch(baseApi.util.invalidateTags(tags));
      }
      dispatch(baseApi.util.invalidateTags([{ type: 'Order', id: 'LIST' }]));
    },
    [branchId, dispatch],
  );

  const realtime = useBranchRealtime({
    branchId,
    onEvent: onRealtimeEvent,
    onResync: () => {
      dispatch(baseApi.util.invalidateTags(['Order']));
    },
  });

  const { data: menu } = useGetPosMenuQuery(branchId ?? '', { skip: !branchId });
  const { data: tablesData } = useListDiningTablesQuery(branchId ?? '', { skip: !branchId });

  const tableLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const table of tablesData?.items ?? []) {
      map.set(table.id, table.label);
    }
    return map;
  }, [tablesData?.items]);

  const formatMinor = useCallback(
    (minor: number) =>
      new Intl.NumberFormat(uiLocale, {
        style: 'currency',
        currency: menu?.branch.currency ?? 'SAR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(minor / 100),
    [menu?.branch.currency, uiLocale],
  );

  const currency = menu?.branch.currency ?? 'SAR';

  const orderDetail = usePosOrderDetail({
    branchId,
    orderId: selectedOrderId,
    onClose: () => {
      setSelectedOrderId(null);
    },
    menu,
    tableLabelById,
    locale,
    defaultLocale,
    formatMinor,
    additionLines: [],
    clearAdditionLines: () => {},
    isAddingItems: false,
    setIsAddingItems: () => {},
    canCancelOrders,
    canCreateOrders,
  });

  const paymentDialog = usePosPaymentDialog({
    branchId,
    order: orderDetail.order,
    acceptsCard: menu?.branch.acceptsCard ?? true,
    onPaymentCaptured: () => {
      void orderDetail.refetchOrder().then((result) => {
        if (result.data?.status === 'placed') {
          toast.success(t('pos.toast.sentToKitchen', { number: result.data.orderNumber }));
        }
      });
    },
    formatMinor,
    currency,
    uiLocale,
  });

  const setTab = useCallback(
    (next: PosOrdersTab) => {
      setSearchParams({ tab: next });
    },
    [setSearchParams],
  );

  const rows = useMemo(() => {
    const takeawayLabel = t('pos.orderType.takeaway');
    return accumulated.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      timeLabel: new Intl.DateTimeFormat(uiLocale, {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: menu?.branch.timezone,
      }).format(new Date(order.createdAt)),
      typeTable: orderTypeTableLabel({
        type: order.type,
        tableLabel:
          order.tableId !== null ? (tableLabelById.get(order.tableId) ?? order.tableLabel) : order.tableLabel,
        customerName: order.customerName,
        takeawayLabel,
      }),
      itemCount: order.itemCount,
      totalLabel: formatMinor(order.totalMinor),
      statusTone: posOrderStatusTone(order.status),
      statusLabel:
        order.status === 'draft'
          ? t('pos.awaitingPaymentBadge')
          : t(`pos.orderStatus.${order.status}`),
      paymentLabel: t(`pos.paymentStatus.${order.paymentStatus}`),
      onSelect: () => {
        setSelectedOrderId(order.id);
      },
    }));
  }, [accumulated, formatMinor, menu?.branch.timezone, t, tableLabelById, uiLocale]);

  return {
    tab,
    tabs: POS_ORDERS_TABS.map((id) => ({
      id,
      label: t(`pos.orders.tabs.${id}`),
      active: tab === id,
      onSelect: () => {
        setTab(id);
      },
    })),
    search: {
      value: searchInput,
      onChange: setSearchInput,
      placeholder: t('pos.orders.searchPlaceholder'),
      clearLabel: t('pos.catalog.searchClear'),
    },
    rows,
    isLoading,
    isError,
    isFetching,
    emptyLabel: t('pos.orders.empty'),
    errorLabel: t('pos.orders.error'),
    loadMore:
      data?.nextCursor !== null && data?.nextCursor !== undefined
        ? {
            label: t('pos.orders.loadMore'),
            loading: isFetching,
            onClick: () => {
              setCursor(data.nextCursor ?? undefined);
            },
          }
        : null,
    realtimeBanner: {
      visible: !realtime.isOnline && realtime.state !== 'connecting',
      message: t('pos.realtimeDisconnected'),
    },
    orderDetail: {
      ...orderDetail,
      onPay: () => {
        paymentDialog.openForOrder();
      },
    },
    paymentDialog,
    onRetry: () => {
      void refetch();
    },
    labels: {
      title: t('pos.orders.title'),
      loading: t('common.loading'),
    },
  };
}

export type PosOrdersPageViewModel = ReturnType<typeof usePosOrdersPage>;
