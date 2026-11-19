import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { toast } from '@app/ui';
import type { OrderDetail, OrderListItem, OrderStatus } from '@app/shared';

import { baseApi } from '../../../app/api/base-api.js';
import { useAppDispatch, useAppSelector } from '../../../app/hooks.js';
import { readPrintAdditions } from '../pos-print-pref.js';
import { intlLocaleForUi, orderMoneyFormatter } from '../../../lib/money.js';
import type { RealtimeEvent } from '../../../lib/realtime.js';
import { ordersApi, useListOrdersQuery } from '../../orders/orders.api.js';
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
  parsePosOrdersTab,
  parseTodayOnly,
  POS_ORDERS_TABS,
  showOlderOrdersHint,
  tabToListQuery,
  type PosOrdersTab,
} from '../pos-orders-list.utils.js';
import { orderTypeTableLabel } from '../../orders/order-type-table-label.utils.js';
import { orderStatusBadgeTone } from '../../orders/orders-display.utils.js';
import { shouldShowSentToKitchenToast } from '../pos-payment-toast.utils.js';
import { useGetPosMenuQuery } from '../pos.api.js';
import { handoverLabelKey, orderIsPaid } from '../pos-order-detail.utils.js';
import { showOrdersApiError } from '../../orders/show-orders-api-error.js';
import { usePosHandover } from './use-pos-handover.js';
import { usePosOrderDetail } from './use-pos-order-detail.js';
import { usePosPaymentDialog } from './use-pos-payment-dialog.js';
import { usePosLockRequest } from '../pos-lock-context.js';

const PAGE_SIZE = 20;

export function usePosOrdersPage() {
  const { t, i18n } = useTranslation();
  const requestLock = usePosLockRequest();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [printAdditionsPref] = useState(readPrintAdditions);
  const branchId = useAppSelector(selectCurrentBranchId);
  const org = useAppSelector(selectSessionOrg);
  const canCancelOrders = useAppSelector(selectCan('orders.cancel'));
  const canReopenOrders = useAppSelector(selectCan('orders.reopen'));
  const canCreateOrders = useAppSelector(selectCan('orders.create'));

  const tab = parsePosOrdersTab(searchParams.get('tab'));
  const todayOnly = parseTodayOnly(searchParams.get('today'), tab);
  const [searchQ, setSearchQ] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [accumulated, setAccumulated] = useState<OrderListItem[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const beforePaymentStatusRef = useRef<OrderStatus | null>(null);
  const handoverAfterPayRef = useRef<string | null>(null);
  /** Row whose handover is being prepared (fetching the order or completing it): its button shows a spinner. */
  const [handoverBusyId, setHandoverBusyId] = useState<string | null>(null);

  const reloadFirstPage = useCallback(() => {
    setCursor(undefined);
    setAccumulated([]);
  }, []);

  useEffect(() => {
    reloadFirstPage();
  }, [tab, todayOnly, branchId, searchQ, reloadFirstPage]);

  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const uiLocale = intlLocaleForUi(i18n.language);
  const defaultLocale = org?.defaultLocale ?? 'en';

  const listQuery = useMemo(
    () => mergeListQueryWithSearch(tabToListQuery(tab, PAGE_SIZE, todayOnly), searchQ),
    [tab, todayOnly, searchQ],
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
      reloadFirstPage();
      const tags = posOrderTagsForEvent([], payload, branchId);
      if (tags.length > 0) {
        dispatch(baseApi.util.invalidateTags(tags));
      }
      dispatch(baseApi.util.invalidateTags([{ type: 'Order', id: 'LIST' }]));
    },
    [branchId, dispatch, reloadFirstPage],
  );

  const realtime = useBranchRealtime({
    branchId,
    onEvent: onRealtimeEvent,
    onResync: () => {
      reloadFirstPage();
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
    uiLocale,
    // Adding items happens on /pos; this page only hands the order over.
    additionLines: [],
    clearAdditionLines: () => {},
    isAddingItems: false,
    onStartAddItems: (orderId: string) => {
      void navigate(`/pos?addTo=${orderId}`);
    },
    onExitAddItems: () => {},
    printAdditions: printAdditionsPref,
    payBeforeSend: false,
    onAdditionsHeld: () => {},
    canCancelOrders,
    canCreateOrders,
    canReopenOrders,
    onHandoverNeedsPayment: () => {
      const current = orderDetail.order;
      if (current) {
        handoverAfterPayRef.current = current.id;
        beforePaymentStatusRef.current = current.status;
        paymentDialog.openForOrder(current);
      }
    },
  });

  const rowHandover = usePosHandover(branchId);

  const paymentDialog = usePosPaymentDialog({
    branchId,
    order: orderDetail.order,
    acceptsCard: menu?.branch.acceptsCard ?? true,
    onDismissUnpaid: () => {
      handoverAfterPayRef.current = null;
    },
    onPaymentCaptured: () => {
      const before = beforePaymentStatusRef.current;
      beforePaymentStatusRef.current = null;
      const handoverId = handoverAfterPayRef.current;
      handoverAfterPayRef.current = null;
      const paidOrderBefore = orderDetail.order;
      const finishHandover = (updated: OrderDetail) => {
        if (handoverId === updated.id && updated.status === 'ready' && orderIsPaid(updated)) {
          void rowHandover.complete(updated).then((done) => {
            if (done) {
              setSelectedOrderId(null);
            }
          });
        }
      };
      if (handoverId !== null && handoverId !== orderDetail.order?.id && branchId) {
        // Started from a list row: the sheet is closed, so fetch the order by id.
        void dispatch(
          ordersApi.endpoints.getOrder.initiate({ branchId, orderId: handoverId }, { forceRefetch: true }),
        )
          .unwrap()
          .then(finishHandover)
          .catch(() => {});
        return;
      }
      void orderDetail.refetchOrder().then((result) => {
        const updated = result.data;
        if (updated) {
          finishHandover(updated);
        }
        if (updated && shouldShowSentToKitchenToast(before, updated.status)) {
          toast.success(t('pos.toast.sentToKitchen', { number: updated.orderNumber }));
        }
        if (updated) {
          orderDetail.announceReleasedAdditions(paidOrderBefore, updated);
        }
      });
    },
    uiLocale,
  });

  /** Row button: paid -> complete at once; unpaid -> payment dialog first, then complete. */
  const handoverRow = useCallback(
    async (row: OrderListItem) => {
      if (!branchId) {
        return;
      }
      setHandoverBusyId(row.id);
      try {
        if (row.paymentStatus === 'paid' || row.totalMinor === 0) {
          await rowHandover.complete(row);
          return;
        }
        const detail = await dispatch(
          ordersApi.endpoints.getOrder.initiate(
            { branchId, orderId: row.id },
            { forceRefetch: true },
          ),
        ).unwrap();
        handoverAfterPayRef.current = detail.id;
        beforePaymentStatusRef.current = detail.status;
        paymentDialog.openForOrder(detail);
      } catch (error) {
        showOrdersApiError(error, t);
      } finally {
        setHandoverBusyId(null);
      }
    },
    [branchId, dispatch, paymentDialog, rowHandover, t],
  );

  const setTodayOnly = useCallback(
    (next: boolean) => {
      setSearchParams({ tab, today: next ? '1' : '0' });
    },
    [setSearchParams, tab],
  );

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
      timeLabel: new Intl.DateTimeFormat(intlLocaleForUi(uiLocale), {
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
      totalLabel: orderMoneyFormatter(order, uiLocale)(order.totalMinor, 'total'),
      statusTone: orderStatusBadgeTone(order.status),
      statusLabel:
        order.status === 'draft'
          ? t('pos.awaitingPaymentBadge')
          : t(`pos.orderStatus.${order.status}`),
      paymentLabel: t(`pos.paymentStatus.${order.paymentStatus}`),
      onSelect: () => {
        setSelectedOrderId(order.id);
      },
      handover:
        order.status === 'ready'
          ? {
              label: t(handoverLabelKey(order.type)),
              loading: handoverBusyId === order.id,
              onClick: () => {
                void handoverRow(order);
              },
            }
          : null,
    }));
  }, [accumulated, handoverBusyId, handoverRow, menu?.branch.timezone, t, tableLabelById, uiLocale]);

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
      onChange: setSearchQ,
      placeholder: t('pos.orders.searchPlaceholder'),
      clearLabel: t('pos.catalog.searchClear'),
    },
    todaySwitch: {
      checked: todayOnly,
      label: t('pos.orders.todayOnly'),
      onChange: setTodayOnly,
    },
    olderHint: showOlderOrdersHint(tab, todayOnly, data?.hiddenOlderCount)
      ? {
          message: t('pos.orders.olderHidden', { count: data?.hiddenOlderCount ?? 0 }),
          actionLabel: t('pos.orders.showOlder'),
          onShowAll: () => {
            setTodayOnly(false);
          },
        }
      : null,
    tableHeaders: {
      order: t('pos.orders.columns.order'),
      time: t('pos.orders.columns.time'),
      typeTable: t('pos.orders.columns.typeTable'),
      items: t('pos.orders.columns.items'),
      total: t('pos.orders.columns.total'),
      status: t('pos.orders.columns.status'),
      payment: t('pos.orders.columns.payment'),
      action: t('pos.orders.columns.action'),
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
        const current = orderDetail.order;
        if (current) {
          beforePaymentStatusRef.current = current.status;
        }
        paymentDialog.openForOrder(current);
      },
    },
    paymentDialog,
    onRetry: () => {
      void refetch();
    },
    lock: {
      label: t('pos.lock.button'),
      onPress: requestLock,
    },
    labels: {
      title: t('pos.orders.title'),
      loading: t('common.loading'),
      retry: t('pos.retry'),
    },
  };
}

export type PosOrdersPageViewModel = ReturnType<typeof usePosOrdersPage>;
