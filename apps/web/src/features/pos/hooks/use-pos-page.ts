import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../../app/hooks.js';
import { formatMoney, intlLocaleForUi } from '../../../lib/money.js';
import { randomUuid } from '../../../lib/uuid.js';
import { cartActions, cartHasUnsavedLines } from '../../cart/cart.slice.js';
import type { CartLine, CartLineInput, CartOrderType } from '../../cart/cart.types.js';
import { cartTotalsPreview, mergeCartLine } from '../../cart/cart.utils.js';
import { applyDashboardBranchChange } from '../../session/apply-dashboard-branch-change.js';
import {
  selectCan,
  selectCurrentBranchId,
  selectSessionBranches,
  selectSessionOrg,
} from '../../session/session.selectors.js';
import { useListDiningTablesQuery } from '../../tables/tables.api.js';
import { useCreateOrderMutation, useListOrdersQuery } from '../../orders/orders.api.js';
import { posLocalizedName } from '../pos-label.utils.js';
import { buildCreateOrderBody } from '../pos-order.utils.js';
import { useGetPosMenuQuery } from '../pos.api.js';
import type { PosMenuProduct } from './use-pos-modifier-sheet.js';
import { usePosModifierSheet } from './use-pos-modifier-sheet.js';
import { usePosOrderDetail } from './use-pos-order-detail.js';
import { usePosPaymentDialog } from './use-pos-payment-dialog.js';

export type SentOrderSummary = {
  orderNumber: number;
  orderId: string;
};

export function usePosPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const org = useAppSelector(selectSessionOrg);
  const branches = useAppSelector(selectSessionBranches);
  const branchId = useAppSelector(selectCurrentBranchId);
  const cart = useAppSelector((state) => state.cart);
  const hasCartLines = useAppSelector(cartHasUnsavedLines);
  const canCancelOrders = useAppSelector(selectCan('orders.cancel'));

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [sendError, setSendError] = useState(false);
  const [sentOrder, setSentOrder] = useState<SentOrderSummary | null>(null);
  const [pendingBranchId, setPendingBranchId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [openOrdersOpen, setOpenOrdersOpen] = useState(false);
  const [isAddingItems, setIsAddingItems] = useState(false);
  const [additionLines, setAdditionLines] = useState<CartLine[]>([]);

  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const uiLocale = intlLocaleForUi(i18n.language);

  const { data: menu, isLoading, isError } = useGetPosMenuQuery(branchId ?? '', {
    skip: !branchId,
  });
  const { data: tablesData } = useListDiningTablesQuery(branchId ?? '', { skip: !branchId });
  const [createOrder, createState] = useCreateOrderMutation();
  const { data: openOrdersData, isLoading: openOrdersLoading } = useListOrdersQuery(
    { branchId: branchId ?? '', query: { activeOnly: true, limit: 100 } },
    { skip: !branchId, pollingInterval: 10_000 },
  );

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

  useEffect(() => {
    if (menu && menu.categories.length > 0 && activeCategoryId === null) {
      setActiveCategoryId(menu.categories[0]?.id ?? null);
    }
  }, [menu, activeCategoryId]);

  const activeCategory = useMemo(() => {
    if (!menu || !activeCategoryId) {
      return null;
    }
    return menu.categories.find((c) => c.id === activeCategoryId) ?? null;
  }, [menu, activeCategoryId]);

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
    setSentOrder({ orderNumber: result.data.orderNumber, orderId: result.data.id });
    dispatch(cartActions.clearCartAfterSuccessfulSend());
  }, [branchId, cart, createOrder, dispatch, isOnline, menu]);

  const onRetrySend = useCallback(() => {
    void onSendToKitchen();
  }, [onSendToKitchen]);

  const onDismissResult = useCallback(() => {
    setSentOrder(null);
  }, []);

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

  const branchName =
    branches.find((b) => b.id === branchId)?.name ?? t('pos.branchUnknown');

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
  });

  const paymentDialog = usePosPaymentDialog({
    branchId,
    order: orderDetail.order,
    onPaymentCaptured: () => {
      void orderDetail.refetchOrder().then(() => {
        orderDetail.printReceipt();
      });
    },
    formatMinor,
    currency,
    uiLocale,
  });

  const cartLines = cart.lines.map((line) => ({
    localId: line.localId,
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

  const productTiles =
    activeCategory?.products.map((product) => ({
      id: product.id,
      name: posLocalizedName(product.name, locale, defaultLocale),
      priceLabel: formatMinor(product.priceMinor),
      imageUrl: product.imageUrl400,
      onPress: () => {
        onProductPress(product);
      },
    })) ?? [];

  const categoryTabs = menu?.categories.map((cat) => ({
    id: cat.id,
    label: posLocalizedName(cat.name, locale, defaultLocale),
    isActive: cat.id === activeCategoryId,
    onSelect: () => {
      setActiveCategoryId(cat.id);
    },
  }));

  const sending = createState.isLoading;
  const showOfflineBanner = !isOnline || sendError;
  const canSend = buildCreateOrderBody(cart) !== null;

  return {
    branchName,
    branchSwitcher: {
      branches: branches.map((b) => ({ id: b.id, name: b.name })),
      value: branchId,
      onValueChange: onBranchChangeRequest,
      ariaLabel: t('dashboard.branchSwitcherLabel'),
      placeholder: t('dashboard.selectBranch'),
    },
    isLoading,
    isError,
    categoryTabs: categoryTabs ?? [],
    productTiles,
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
      open: openOrdersOpen,
      onToggle: () => {
        setOpenOrdersOpen((prev) => !prev);
      },
      isLoading: openOrdersLoading,
      orders: (openOrdersData?.items ?? []).map((order) => ({
        id: order.id,
        orderNumberLabel: t('pos.result.orderNumber', { number: order.orderNumber }),
        statusLabel: t(`pos.orderStatus.${order.status}`),
        totalLabel: formatMinor(order.totalMinor),
        metaLabel:
          order.tableId !== null
            ? (tableLabelById.get(order.tableId) ?? t('pos.orderType.dineIn'))
            : (order.customerName ?? t('pos.orderType.takeaway')),
        onSelect: () => {
          setSelectedOrderId(order.id);
        },
      })),
      labels: {
        title: t('pos.openOrders.title'),
        empty: t('pos.openOrders.empty'),
        toggle: t('pos.openOrders.toggle'),
        close: t('pos.actions.close'),
      },
    },
    orderDetail: {
      ...orderDetail,
      onPay: () => {
        paymentDialog.openForOrder();
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
    sentOrder,
    onDismissResult,
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
      sendToKitchen: sending ? t('pos.sending') : t('pos.sendToKitchen'),
      orderTypeDineIn: t('pos.orderType.dineIn'),
      orderTypeTakeaway: t('pos.orderType.takeaway'),
      table: t('pos.table'),
      customer: t('pos.customer'),
      orderNote: t('pos.orderNote'),
      subtotal: t('pos.totals.subtotal'),
      tax: menu?.branch.taxInclusive ? t('pos.totals.taxIncl') : t('pos.totals.tax'),
      total: t('pos.totals.total'),
      resultTitle: t('pos.result.title'),
      resultOrderNumber: t('pos.result.orderNumber', {
        number: sentOrder?.orderNumber ?? 0,
      }),
      newOrder: t('pos.result.newOrder'),
      loadError: t('pos.loadError'),
      cartEmpty: t('pos.cart.empty'),
      retry: t('pos.retry'),
      loading: t('common.loading'),
      close: t('pos.actions.close'),
    },
  };
}

export type PosPageViewModel = ReturnType<typeof usePosPage>;
