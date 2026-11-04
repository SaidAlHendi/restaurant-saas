import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { toast } from '@app/ui';
import type { OrderDetail, OrderStatus } from '@app/shared';

import { baseApi } from '../../../app/api/base-api.js';
import { useAppDispatch, useAppSelector } from '../../../app/hooks.js';
import type { RealtimeEvent } from '../../../lib/realtime.js';
import { localizedName } from '../../../lib/localized-name.js';
import { formatMoney, intlLocaleForUi } from '../../../lib/money.js';
import { randomUuid } from '../../../lib/uuid.js';
import { cartActions, cartHasUnsavedLines } from '../../cart/cart.slice.js';
import type { CartLine, CartLineInput, CartOrderType } from '../../cart/cart.types.js';
import { cartTotalsPreview, mergeCartLine } from '../../cart/cart.utils.js';
import { useBranchRealtime } from '../../realtime/use-branch-realtime.js';
import { applyDashboardBranchChange } from '../../session/apply-dashboard-branch-change.js';
import {
  selectCan,
  selectCurrentBranchId,
  selectSessionBranches,
  selectSessionOrg,
} from '../../session/session.selectors.js';
import { useListDiningTablesQuery } from '../../tables/tables.api.js';
import {
  ordersApi,
  useCreateOrderMutation,
  useListOrdersQuery,
} from '../../orders/orders.api.js';
import {
  ALL_CATEGORIES,
  lastLineOfProduct,
  quantityByProduct,
  visiblePosProducts,
} from '../pos-catalog.utils.js';
import { orderStatusBadgeTone } from '../../orders/orders-display.utils.js';
import { posLocalizedName } from '../pos-label.utils.js';
import { buildCreateOrderBody } from '../pos-order.utils.js';
import { posOrderTagsForEvent } from '../pos-realtime.utils.js';
import { useGetPosMenuQuery } from '../pos.api.js';
import type { PosMenuProduct } from './use-pos-modifier-sheet.js';
import { usePosModifierSheet } from './use-pos-modifier-sheet.js';
import { usePosOrderDetail } from './use-pos-order-detail.js';
import { shouldShowSentToKitchenToast } from '../pos-payment-toast.utils.js';
import { usePosPaymentDialog } from './use-pos-payment-dialog.js';
import { usePosLockRequest } from '../pos-lock-context.js';

export function usePosPage() {
  const { t, i18n } = useTranslation();
  const requestLock = usePosLockRequest();
  const dispatch = useAppDispatch();
  const org = useAppSelector(selectSessionOrg);
  const branches = useAppSelector(selectSessionBranches);
  const branchId = useAppSelector(selectCurrentBranchId);
  const cart = useAppSelector((state) => state.cart);
  const hasCartLines = useAppSelector(cartHasUnsavedLines);
  const canCancelOrders = useAppSelector(selectCan('orders.cancel'));
  const canCreateOrders = useAppSelector(selectCan('orders.create'));

  const [activeCategoryId, setActiveCategoryId] = useState<string>(ALL_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [sendError, setSendError] = useState(false);
  const [checkoutOrder, setCheckoutOrder] = useState<OrderDetail | null>(null);
  const [pendingBranchId, setPendingBranchId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isAddingItems, setIsAddingItems] = useState(false);
  const [additionLines, setAdditionLines] = useState<CartLine[]>([]);

  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const uiLocale = intlLocaleForUi(i18n.language);

  const {
    data: menu,
    isLoading,
    isError,
  } = useGetPosMenuQuery(branchId ?? '', {
    skip: !branchId,
  });
  const { data: tablesData } = useListDiningTablesQuery(branchId ?? '', { skip: !branchId });
  const [createOrder, createState] = useCreateOrderMutation();

  // Socket events are hints: refetch the open orders list / that order when it changed.
  const openOrdersRef = useRef<Array<{ id: string; version: number }>>([]);
  const beforePaymentStatusRef = useRef<OrderStatus | null>(null);
  const onRealtimeEvent = useCallback(
    ({ payload }: RealtimeEvent) => {
      if (!branchId) {
        return;
      }
      const tags = posOrderTagsForEvent(openOrdersRef.current, payload, branchId);
      if (tags.length > 0) {
        dispatch(baseApi.util.invalidateTags(tags));
      }
    },
    [branchId, dispatch],
  );
  const onRealtimeResync = useCallback(() => {
    dispatch(baseApi.util.invalidateTags(['Order']));
  }, [dispatch]);
  const realtime = useBranchRealtime({
    branchId,
    onEvent: onRealtimeEvent,
    onResync: onRealtimeResync,
  });

  const { data: openOrdersData, isLoading: openOrdersLoading } = useListOrdersQuery(
    { branchId: branchId ?? '', query: { activeOnly: true, limit: 100 } },
    // Polling is only a fallback while the socket is down.
    { skip: !branchId, pollingInterval: realtime.isOnline ? 0 : 60_000 },
  );

  useEffect(() => {
    openOrdersRef.current = openOrdersData?.items ?? [];
  }, [openOrdersData]);

  const defaultLocale = org?.defaultLocale ?? 'en';

  const addAdditionLine = useCallback((line: CartLineInput) => {
    setAdditionLines((prev) => mergeCartLine(prev, { ...line, localId: randomUuid() }));
  }, []);

  const clearAdditionLines = useCallback(() => {
    setAdditionLines([]);
  }, []);

  const modifierSheet = usePosModifierSheet({
    locale,
    defaultLocale,
    onAddLine: isAddingItems ? addAdditionLine : undefined,
  });

  useEffect(() => {
    if (branchId) {
      dispatch(cartActions.initCartForBranch(branchId));
    }
  }, [branchId, dispatch]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
    };
    const onOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // A category from another branch's menu falls back to "All".
  const selectedCategoryId =
    menu?.categories.some((c) => c.id === activeCategoryId) === true
      ? activeCategoryId
      : ALL_CATEGORIES;

  const visibleProducts = useMemo(
    () => (menu ? visiblePosProducts(menu.categories, selectedCategoryId, searchQuery) : []),
    [menu, selectedCategoryId, searchQuery],
  );

  const imageByProductId = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const category of menu?.categories ?? []) {
      for (const product of category.products) {
        map.set(product.id, product.imageUrl400);
      }
    }
    return map;
  }, [menu]);

  const currency = menu?.branch.currency ?? org?.defaultCurrency ?? 'USD';

  const totals = useMemo(() => {
    if (!menu) {
      return null;
    }
    return cartTotalsPreview({
      lines: cart.lines,
      taxRateBp: menu.branch.taxRateBp,
      taxInclusive: menu.branch.taxInclusive,
    });
  }, [cart.lines, menu]);

  const formatMinor = useCallback(
    (minor: number) => formatMoney(minor, currency, uiLocale),
    [currency, uiLocale],
  );

  const onProductPress = useCallback(
    (product: PosMenuProduct) => {
      const line: CartLineInput = {
        productId: product.id,
        nameSnapshot: product.name,
        unitPriceMinor: product.priceMinor,
        modifierIds: [],
        modifierNames: {},
        quantity: 1,
        note: '',
      };
      if (isAddingItems) {
        if (product.modifierGroups.length === 0) {
          addAdditionLine(line);
        } else {
          modifierSheet.openForProduct(product);
        }
        return;
      }
      if (product.modifierGroups.length === 0) {
        dispatch(cartActions.addLine(line));
        return;
      }
      modifierSheet.openForProduct(product);
    },
    [addAdditionLine, dispatch, isAddingItems, modifierSheet],
  );

  const onBranchChangeRequest = useCallback(
    (nextBranchId: string) => {
      if (nextBranchId === branchId) {
        return;
      }
      if (hasCartLines) {
        setPendingBranchId(nextBranchId);
        return;
      }
      if (org) {
        applyDashboardBranchChange(dispatch, org.id, nextBranchId);
        dispatch(cartActions.replaceCartBranch(nextBranchId));
      }
    },
    [branchId, dispatch, hasCartLines, org],
  );

  const confirmBranchSwitch = useCallback(() => {
    if (!org || !pendingBranchId) {
      return;
    }
    applyDashboardBranchChange(dispatch, org.id, pendingBranchId);
    dispatch(cartActions.replaceCartBranch(pendingBranchId));
    setPendingBranchId(null);
  }, [dispatch, org, pendingBranchId]);

  const cancelBranchSwitch = useCallback(() => {
    setPendingBranchId(null);
  }, []);

  const branchName = branches.find((b) => b.id === branchId)?.name ?? t('pos.branchUnknown');

  const tableOptions = useMemo(() => {
    const items = tablesData?.items ?? [];
    return items.filter((table) => table.isActive);
  }, [tablesData?.items]);

  const busyTableIds = useMemo(() => {
    const ids = new Set<string>();
    for (const order of openOrdersData?.items ?? []) {
      if (order.tableId !== null) {
        ids.add(order.tableId);
      }
    }
    return ids;
  }, [openOrdersData?.items]);

  const tableLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const table of tableOptions) {
      map.set(table.id, table.label);
    }
    return map;
  }, [tableOptions]);

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
    additionLines,
    clearAdditionLines,
    isAddingItems,
    setIsAddingItems,
    canCancelOrders,
    canCreateOrders,
  });

  const paymentOrder = checkoutOrder ?? orderDetail.order;

  const paymentDialog = usePosPaymentDialog({
    branchId,
    order: paymentOrder,
    acceptsCard: menu?.branch.acceptsCard ?? true,
    onPaymentCaptured: () => {
      const before = beforePaymentStatusRef.current;
      beforePaymentStatusRef.current = null;
      const checkoutId = checkoutOrder?.id;
      const activeBranchId = branchId;
      setCheckoutOrder(null);

      const finish = (updated: OrderDetail | undefined) => {
        if (updated && shouldShowSentToKitchenToast(before, updated.status)) {
          toast.success(t('pos.toast.sentToKitchen', { number: updated.orderNumber }));
        }
        if (updated && selectedOrderId === updated.id) {
          orderDetail.printReceipt();
        }
      };

      if (checkoutId && activeBranchId) {
        void dispatch(
          ordersApi.endpoints.getOrder.initiate(
            { branchId: activeBranchId, orderId: checkoutId },
            { forceRefetch: true },
          ),
        )
          .unwrap()
          .then(finish)
          .catch(() => {});
        return;
      }
      void orderDetail.refetchOrder().then((result) => {
        finish(result.data);
      });
    },
    onDismissUnpaid: () => {
      const checkoutId = checkoutOrder?.id;
      const activeBranchId = branchId;
      setCheckoutOrder(null);
      if (checkoutId && activeBranchId) {
        void dispatch(
          ordersApi.endpoints.getOrder.initiate(
            { branchId: activeBranchId, orderId: checkoutId },
            { forceRefetch: true },
          ),
        )
          .unwrap()
          .then((updated) => {
            if (updated.status === 'draft') {
              toast.info(t('pos.toast.awaitingPayment', { number: updated.orderNumber }));
            }
          })
          .catch(() => {});
        return;
      }
      void orderDetail.refetchOrder().then((result) => {
        const updated = result.data;
        if (updated?.status === 'draft') {
          toast.info(t('pos.toast.awaitingPayment', { number: updated.orderNumber }));
        }
      });
    },
    formatMinor,
    currency,
    uiLocale,
  });

  const onSendToKitchen = useCallback(async () => {
    if (!branchId || !menu) {
      return;
    }
    setSendError(false);
    const body = buildCreateOrderBody(cart);
    if (!body) {
      return;
    }
    if (!isOnline) {
      setSendError(true);
      return;
    }
    const result = await createOrder({
      branchId,
      body,
      idempotencyKey: cart.clientOrderId,
    });
    if ('error' in result) {
      setSendError(true);
      return;
    }
    const order = result.data;
    dispatch(cartActions.clearCartAfterSuccessfulSend());
    if (order.status === 'draft') {
      beforePaymentStatusRef.current = order.status;
      setCheckoutOrder(order);
      paymentDialog.openForOrder(order);
      return;
    }
    toast.success(t('pos.toast.sentToKitchen', { number: order.orderNumber }));
  }, [branchId, cart, createOrder, dispatch, isOnline, menu, paymentDialog, t]);

  const onRetrySend = useCallback(() => {
    void onSendToKitchen();
  }, [onSendToKitchen]);

  const cartLines = cart.lines.map((line) => ({
    localId: line.localId,
    imageUrl: imageByProductId.get(line.productId) ?? null,
    name: posLocalizedName(line.nameSnapshot, locale, defaultLocale),
    unitPriceLabel: formatMinor(line.unitPriceMinor),
    lineTotalLabel: formatMinor(line.unitPriceMinor * line.quantity),
    quantity: line.quantity,
    modifiers: line.modifierIds.map((id) => ({
      id,
      label: posLocalizedName(line.modifierNames[id] ?? { en: id }, locale, defaultLocale),
    })),
    note: line.note,
    onIncrease: () => {
      dispatch(
        cartActions.updateLineQuantity({ localId: line.localId, quantity: line.quantity + 1 }),
      );
    },
    onDecrease: () => {
      dispatch(
        cartActions.updateLineQuantity({ localId: line.localId, quantity: line.quantity - 1 }),
      );
    },
    onRemove: () => {
      dispatch(cartActions.removeLine(line.localId));
    },
    decreaseLabel: t('pos.cart.decreaseQty'),
    increaseLabel: t('pos.cart.increaseQty'),
    removeLabel: t('pos.cart.removeLine'),
  }));

  // While adding items to a sent order, the cards count the additions, not the cart.
  const stepperLines = isAddingItems ? additionLines : cart.lines;
  const quantities = quantityByProduct(stepperLines);

  const decreaseProduct = (productId: string) => {
    const target = lastLineOfProduct(stepperLines, productId);
    if (!target) {
      return;
    }
    if (isAddingItems) {
      setAdditionLines((prev) =>
        prev
          .map((row) =>
            row.localId === target.localId ? { ...row, quantity: row.quantity - 1 } : row,
          )
          .filter((row) => row.quantity > 0),
      );
      return;
    }
    dispatch(
      cartActions.updateLineQuantity({ localId: target.localId, quantity: target.quantity - 1 }),
    );
  };

  const productTiles = visibleProducts.map((product) => ({
    id: product.id,
    name: posLocalizedName(product.name, locale, defaultLocale),
    priceLabel: formatMinor(product.priceMinor),
    imageUrl: product.imageUrl400,
    hint: product.modifierGroups.length > 0 ? t('pos.catalog.hasOptions') : undefined,
    onPress: () => {
      onProductPress(product);
    },
    stepper: {
      quantity: quantities.get(product.id) ?? 0,
      onDecrease: () => {
        decreaseProduct(product.id);
      },
      decreaseLabel: t('pos.cart.decreaseQty'),
      increaseLabel: t('pos.cart.increaseQty'),
    },
  }));

  const allProductsCount =
    menu?.categories.reduce((sum, category) => sum + category.products.length, 0) ?? 0;
  const categoryTabs = menu
    ? [
        {
          id: ALL_CATEGORIES,
          label: t('pos.catalog.all'),
          countLabel: t('pos.catalog.items', { count: allProductsCount }),
          isActive: selectedCategoryId === ALL_CATEGORIES,
          onSelect: () => {
            setActiveCategoryId(ALL_CATEGORIES);
          },
        },
        ...menu.categories.map((cat) => ({
          id: cat.id,
          label: posLocalizedName(cat.name, locale, defaultLocale),
          countLabel: t('pos.catalog.items', { count: cat.products.length }),
          isActive: cat.id === selectedCategoryId,
          onSelect: () => {
            setActiveCategoryId(cat.id);
          },
        })),
      ]
    : [];

  const sending = createState.isLoading;
  const showOfflineBanner = !isOnline || sendError;
  const canSend = buildCreateOrderBody(cart) !== null;

  return {
    branchName,
    realtimeBanner: {
      visible: !realtime.isOnline && realtime.state !== 'connecting',
      message: t('pos.realtimeDisconnected'),
    },
    branchSwitcher: {
      branches: branches.map((b) => ({ id: b.id, name: localizedName(b.name, i18n.language) })),
      value: branchId,
      onValueChange: onBranchChangeRequest,
      ariaLabel: t('dashboard.branchSwitcherLabel'),
      placeholder: t('dashboard.selectBranch'),
    },
    lock: {
      label: t('pos.lock.button'),
      onPress: requestLock,
    },
    isLoading,
    isError,
    categoryTabs,
    productTiles,
    search: {
      value: searchQuery,
      onChange: setSearchQuery,
      placeholder: t('pos.catalog.searchPlaceholder'),
      clearLabel: t('pos.catalog.searchClear'),
      noResults: t('pos.catalog.noResults'),
    },
    orderType: cart.orderType,
    onOrderTypeChange: (type: CartOrderType) => {
      dispatch(cartActions.setOrderType(type));
    },
    tableId: cart.tableId,
    onTableChange: (id: string | null) => {
      dispatch(cartActions.setTableId(id));
    },
    customerName: cart.customerName,
    onCustomerNameChange: (value: string) => {
      dispatch(cartActions.setCustomerName(value));
    },
    orderNote: cart.orderNote,
    onOrderNoteChange: (value: string) => {
      dispatch(cartActions.setOrderNote(value));
    },
    tableOptions: tableOptions.map((table) => ({
      id: table.id,
      label: busyTableIds.has(table.id)
        ? t('pos.tableBusyLabel', { label: table.label })
        : table.label,
      disabled: busyTableIds.has(table.id),
    })),
    openOrders: {
      isLoading: openOrdersLoading,
      orders: (openOrdersData?.items ?? []).map((order) => {
        const tableLabel = order.tableId !== null ? tableLabelById.get(order.tableId) : undefined;
        return {
          id: order.id,
          code: tableLabel ?? `#${String(order.orderNumber)}`,
          title:
            tableLabel !== undefined
              ? t('pos.result.orderNumber', { number: order.orderNumber })
              : (order.customerName ?? t('pos.result.orderNumber', { number: order.orderNumber })),
          detail: `${t('pos.catalog.items', { count: order.itemCount })} · ${formatMinor(order.totalMinor)}`,
          status: orderStatusBadgeTone(order.status),
          statusLabel:
            order.status === 'draft'
              ? t('pos.awaitingPaymentBadge')
              : t(`pos.orderStatus.${order.status}`),
          onSelect: () => {
            setSelectedOrderId(order.id);
          },
        };
      }),
      labels: {
        title: t('pos.openOrders.title'),
        empty: t('pos.openOrders.empty'),
      },
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
    isAddingItems,
    addingItemsHint: isAddingItems ? t('pos.orderDetail.addItemsHint') : null,
    cartLines,
    cartEmpty: cart.lines.length === 0,
    totals,
    taxInclusive: menu?.branch.taxInclusive ?? false,
    formatMinor,
    onSendToKitchen,
    sending,
    sendDisabled: sending || !canSend,
    showOfflineBanner,
    offlineMessage: !isOnline ? t('pos.offline') : t('pos.sendFailed'),
    onRetrySend,
    modifierSheet: {
      ...modifierSheet,
      formatMinor,
      locale,
      defaultLocale,
      validationMessage: t('pos.modifiers.invalid'),
      addLabel: t('pos.modifiers.addToCart'),
      quantityLabel: t('pos.modifiers.quantity'),
      noteLabel: t('pos.modifiers.note'),
      notePlaceholder: t('pos.modifiers.notePlaceholder'),
      decrementLabel: t('pos.cart.decreaseQty'),
      incrementLabel: t('pos.cart.increaseQty'),
    },
    branchSwitchConfirm: {
      open: pendingBranchId !== null,
      title: t('pos.branchSwitch.title'),
      description: t('pos.branchSwitch.description'),
      confirmLabel: t('pos.branchSwitch.confirm'),
      cancelLabel: t('pos.actions.cancel'),
      onConfirm: confirmBranchSwitch,
      onCancel: cancelBranchSwitch,
    },
    labels: {
      cartTitle: t('pos.cart.title'),
      cartCount: t('pos.catalog.items', {
        count: cart.lines.reduce((sum: number, row) => sum + row.quantity, 0),
      }),
      sendToKitchen: sending
        ? t('pos.sending')
        : menu?.branch.payBeforeSend
          ? t('pos.payAndSend')
          : t('pos.sendToKitchen'),
      orderTypeDineIn: t('pos.orderType.dineIn'),
      orderTypeTakeaway: t('pos.orderType.takeaway'),
      table: t('pos.table'),
      customer: t('pos.customer'),
      orderNote: t('pos.orderNote'),
      subtotal: t('pos.totals.subtotal'),
      tax: menu?.branch.taxInclusive ? t('pos.totals.taxIncl') : t('pos.totals.tax'),
      total: t('pos.totals.total'),
      loadError: t('pos.loadError'),
      cartEmpty: t('pos.cart.empty'),
      retry: t('pos.retry'),
      loading: t('common.loading'),
      close: t('pos.actions.close'),
    },
  };
}

export type PosPageViewModel = ReturnType<typeof usePosPage>;
