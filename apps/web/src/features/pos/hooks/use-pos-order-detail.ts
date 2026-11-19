import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { toast } from '@app/ui';

import type { OrderDetail, OrderItem, OrderStatus, PosMenuPayload } from '@app/shared';

import { openPrintWindow } from '../../../lib/print/open-print-window.js';
import { printLocaleFromUi } from '../../../lib/print/print-document.js';
import { activeOrderItems, newlyAddedItems, releasedAdditions } from '../../../lib/print/kitchen-addition-diff.js';
import { renderKitchenHtml } from '../../../lib/print/kitchen-html.js';
import {
  moneyFormatter,
  orderMoneyFormatter,
  paymentCashLabels,
  type MoneyFormatter,
} from '../../../lib/money.js';
import { renderReceiptHtml } from '../../../lib/print/receipt-html.js';
import type { CartLine } from '../../cart/cart.types.js';
import {
  useAddOrderItemsMutation,
  useChangeOrderStatusMutation,
  useGetOrderQuery,
  useVoidOrderItemMutation,
} from '../../orders/orders.api.js';
import { parseOrdersApiErrorCode } from '../../orders/orders-api-errors.js';
import { showOrdersApiError } from '../../orders/show-orders-api-error.js';
import { buildAddOrderItemsBody } from '../pos-add-items.utils.js';
import {
  cancelOrderNeedsApproval,
  voidItemNeedsApproval,
} from '../pos-approval.utils.js';
import { posLocalizedName } from '../pos-label.utils.js';
import {
  canShowCancelOrder,
  canShowPay,
  canVoidOrderItem,
  handoverLabelKey,
  nextOrderStatusTarget,
  orderIsPaid,
} from '../pos-order-detail.utils.js';
import { usePosHandover } from './use-pos-handover.js';
import { usePosOrderActionDialog } from './use-pos-order-action-dialog.js';

export function usePosOrderDetail(input: {
  branchId: string | null;
  orderId: string | null;
  onClose: () => void;
  menu: PosMenuPayload | undefined;
  tableLabelById: Map<string, string>;
  locale: string;
  defaultLocale: string;
  uiLocale: string;
  additionLines: CartLine[];
  clearAdditionLines: () => void;
  /** True while the cashier is adding items to this order on /pos (the sheet stays closed). */
  isAddingItems: boolean;
  onStartAddItems: (orderId: string) => void;
  onExitAddItems: () => void;
  printAdditions: boolean;
  /** Pay-before-send branch: additions are held until paid, so the page opens payment right after saving them. */
  payBeforeSend: boolean;
  onAdditionsHeld: (order: OrderDetail) => void;
  canCancelOrders: boolean;
  canCreateOrders: boolean;
  /** Unpaid ready order: the page opens the payment dialog, then completes the handover. */
  onHandoverNeedsPayment: () => void;
}) {
  const { t } = useTranslation();
  const [voidItemId, setVoidItemId] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const skip = !input.branchId || !input.orderId;
  const { data: order, refetch, isFetching, isError: orderLoadFailed } = useGetOrderQuery(
    { branchId: input.branchId ?? '', orderId: input.orderId ?? '' },
    { skip },
  );

  // The order's own (frozen) display currency, not the one the menu shows today.
  const formatMinor = useMemo<MoneyFormatter>(
    () =>
      order
        ? orderMoneyFormatter(order, input.uiLocale)
        : moneyFormatter(input.menu?.branch.currency ?? 'USD', input.uiLocale, null),
    [input.menu?.branch.currency, input.uiLocale, order],
  );

  const [changeStatus, changeState] = useChangeOrderStatusMutation();
  const [addItems, addState] = useAddOrderItemsMutation();
  const [voidItem, voidState] = useVoidOrderItemMutation();

  const tableLabel =
    order?.tableId !== null && order?.tableId !== undefined
      ? (input.tableLabelById.get(order.tableId) ?? null)
      : null;

  const handleConflict = useCallback(
    (error: unknown) => {
      const code = parseOrdersApiErrorCode(error);
      if (code === 'ORDER_VERSION_CONFLICT') {
        void refetch();
      }
      showOrdersApiError(error, t);
    },
    [refetch, t],
  );

  const runStatusChange = useCallback(
    async (to: OrderStatus, reason?: string) => {
      if (!input.branchId || !order) {
        return;
      }
      const result = await changeStatus({
        branchId: input.branchId,
        orderId: order.id,
        body: {
          to,
          expectedVersion: order.version,
          reason,
        },
      });
      if ('error' in result) {
        handleConflict(result.error);
        return;
      }
      if (to === 'cancelled') {
        input.onClose();
      }
    },
    [changeStatus, handleConflict, input, order],
  );

  const handover = usePosHandover(input.branchId);
  const { complete: completeHandover } = handover;

  const onComplete = useCallback(() => {
    if (!order) {
      return;
    }
    if (!orderIsPaid(order)) {
      input.onHandoverNeedsPayment();
      return;
    }
    void completeHandover(order).then((done) => {
      if (done) {
        input.onClose();
      }
    });
  }, [completeHandover, input, order]);

  const onStartPreparing = useCallback(() => {
    void runStatusChange('preparing');
  }, [runStatusChange]);

  const onMarkReady = useCallback(() => {
    void runStatusChange('ready');
  }, [runStatusChange]);

  const cancelNeedsApproval =
    order !== undefined &&
    cancelOrderNeedsApproval(order.status, input.canCancelOrders);

  const voidNeedsApproval =
    order !== undefined &&
    voidItemNeedsApproval(
      order.status,
      input.canCancelOrders,
      input.canCreateOrders,
    );

  const cancelDialog = usePosOrderActionDialog({
    branchId: input.branchId,
    open: cancelOpen,
    needsApproval: cancelNeedsApproval,
    onClose: () => {
      setCancelOpen(false);
    },
    submitting: changeState.isLoading,
    title: t('pos.orderDetail.cancelTitle'),
    reasonLabel: t('pos.orderDetail.cancelReason'),
    confirmLabel: t('pos.orderDetail.cancelConfirm'),
    cancelLabel: t('pos.actions.cancel'),
    onExecute: async ({ reason, approval }) => {
      if (!input.branchId || !order) {
        return { ok: false as const, error: new Error('missing order') };
      }
      const result = await changeStatus({
        branchId: input.branchId,
        orderId: order.id,
        body: {
          to: 'cancelled',
          expectedVersion: order.version,
          reason,
          ...(approval !== undefined ? { approval } : {}),
        },
      });
      if ('error' in result) {
        if (parseOrdersApiErrorCode(result.error) === 'ORDER_VERSION_CONFLICT') {
          void refetch();
        }
        return { ok: false as const, error: result.error };
      }
      input.onClose();
      return { ok: true as const };
    },
  });

  const voidDialog = usePosOrderActionDialog({
    branchId: input.branchId,
    open: voidItemId !== null,
    needsApproval: voidNeedsApproval,
    onClose: () => {
      setVoidItemId(null);
    },
    submitting: voidState.isLoading,
    title: t('pos.orderDetail.voidTitle'),
    reasonLabel: t('pos.orderDetail.voidReason'),
    confirmLabel: t('pos.orderDetail.voidConfirm'),
    cancelLabel: t('pos.actions.cancel'),
    onExecute: async ({ reason, approval }) => {
      if (!input.branchId || !order || voidItemId === null) {
        return { ok: false as const, error: new Error('missing order') };
      }
      const result = await voidItem({
        branchId: input.branchId,
        orderId: order.id,
        itemId: voidItemId,
        body: {
          expectedVersion: order.version,
          reason,
          ...(approval !== undefined ? { approval } : {}),
        },
      });
      if ('error' in result) {
        if (parseOrdersApiErrorCode(result.error) === 'ORDER_VERSION_CONFLICT') {
          void refetch();
        }
        return { ok: false as const, error: result.error };
      }
      setVoidItemId(null);
      return { ok: true as const };
    },
  });

  const printKitchenTicket = useCallback(
    (target: OrderDetail, items: OrderItem[], additionsOnly: boolean) => {
      if (items.length === 0) {
        return;
      }
      const html = renderKitchenHtml({
        order: target,
        items,
        tableLabel:
          target.tableId !== null ? (input.tableLabelById.get(target.tableId) ?? null) : null,
        locale: input.locale,
        fallbackLocale: input.defaultLocale,
        timeZone: input.menu?.branch.timezone ?? 'UTC',
        printedAt: new Date(),
        title: additionsOnly ? t('pos.print.kitchenAdditionTitle') : t('pos.print.kitchenTitle'),
        isAdditionTicket: additionsOnly,
        labels: {
          dineIn: t('pos.orderType.dineIn'),
          takeaway: t('pos.orderType.takeaway'),
          pager: t('pos.print.pager'),
          additionHeader: t('pos.print.kitchenAdditionTitle'),
        },
      });
      openPrintWindow(t('pos.print.kitchenTitle'), html, printLocaleFromUi(input.locale));
    },
    [input, t],
  );

  const submitAdditions = useCallback(async () => {
    if (!input.branchId || !order) {
      return;
    }
    const body = buildAddOrderItemsBody(input.additionLines, order.version);
    if (!body) {
      return;
    }
    const result = await addItems({
      branchId: input.branchId,
      orderId: order.id,
      body,
    });
    if ('error' in result) {
      handleConflict(result.error);
      return;
    }
    const added = newlyAddedItems(order, result.data);
    if (input.payBeforeSend) {
      // Held until paid: nothing goes to the kitchen yet, so no ticket and no "sent" toast.
      input.clearAdditionLines();
      input.onExitAddItems();
      input.onAdditionsHeld(result.data);
      return;
    }
    if (input.printAdditions && added.length > 0) {
      printKitchenTicket(result.data, added, true);
    }
    if (added.length > 0) {
      toast.success(
        t('pos.toast.additionsSent', {
          count: added.reduce((sum: number, item) => sum + item.quantity, 0),
          number: order.orderNumber,
        }),
      );
    }
    input.clearAdditionLines();
    input.onExitAddItems();
  }, [addItems, handleConflict, input, order, printKitchenTicket, t]);

  /** After a payment: tell the cashier which held additions just went to the kitchen, and print them. */
  const announceReleasedAdditions = useCallback(
    (before: OrderDetail | undefined, after: OrderDetail) => {
      if (!before) {
        return;
      }
      const released = releasedAdditions(before, after);
      if (released.length === 0) {
        return;
      }
      if (input.printAdditions) {
        printKitchenTicket(after, released, true);
      }
      toast.success(
        t('pos.toast.additionsSent', {
          count: released.reduce((sum: number, item) => sum + item.quantity, 0),
          number: after.orderNumber,
        }),
      );
    },
    [input.printAdditions, printKitchenTicket, t],
  );

  // `override` lets the caller print a freshly fetched order (e.g. right after payment).
  const printReceipt = useCallback((override?: OrderDetail) => {
    const receiptOrder = override ?? order;
    if (!receiptOrder || !input.menu) {
      return;
    }
    const html = renderReceiptHtml({
      order: receiptOrder,
      menu: input.menu,
      tableLabel,
      locale: input.locale,
      fallbackLocale: input.defaultLocale,
      formatMinor,
      cashLabels: (payment) => paymentCashLabels(payment, receiptOrder, input.uiLocale),
      printedAt: new Date(),
      labels: {
        subtotal: t('pos.totals.subtotal'),
        tax: t('pos.totals.tax'),
        taxInclusiveSuffix: input.menu.branch.taxInclusive ? t('pos.print.taxInclSuffix') : '',
        total: t('pos.totals.total'),
        orderNumber: t('pos.result.orderNumber', { number: receiptOrder.orderNumber }),
        dineIn: t('pos.orderType.dineIn'),
        takeaway: t('pos.orderType.takeaway'),
        pager: t('pos.print.pager'),
        paymentMethodCash: t('pos.payment.methodCash'),
        paymentMethodCard: t('pos.payment.methodCard'),
        paymentMethodOther: t('pos.payment.methodOther'),
        tendered: t('pos.payment.tendered'),
        change: t('pos.payment.change'),
      },
    });
    openPrintWindow(t('pos.print.receiptTitle'), html, printLocaleFromUi(input.locale));
  }, [formatMinor, input, order, t, tableLabel]);

  const itemRows = useMemo(() => {
    if (!order) {
      return [];
    }
    return order.items.map((item) => ({
      id: item.id,
      name: posLocalizedName(item.productNameSnapshot, input.locale, input.defaultLocale),
      quantity: item.quantity,
      lineTotalLabel: formatMinor(item.lineTotalMinor),
      voided: item.status === 'voided',
      isAddition: item.isAddition,
      awaitingPayment: item.status === 'awaiting_payment',
      awaitingPaymentLabel: t('pos.orderDetail.itemAwaitingPayment'),
      onVoid: canVoidOrderItem(order, item.status === 'voided', item.status === 'awaiting_payment')
        ? () => {
            setVoidItemId(item.id);
          }
        : undefined,
      voidLabel: t('pos.orderDetail.voidItem'),
    }));
  }, [formatMinor, input, order, t]);

  const canAddItems =
    order !== undefined && (order.status === 'placed' || order.status === 'preparing');

  const canPay = order !== undefined && canShowPay(order);

  const canCancel =
    order !== undefined &&
    canShowCancelOrder(input.canCancelOrders, input.canCreateOrders, order.status);

  const nextStatusAction = useMemo(() => {
    if (!order) {
      return null;
    }
    const target = nextOrderStatusTarget(order);
    if (target === 'preparing') {
      return { label: t('pos.orderDetail.markPreparing'), onClick: onStartPreparing };
    }
    if (target === 'ready') {
      return { label: t('pos.orderDetail.markReady'), onClick: onMarkReady };
    }
    if (target === 'completed') {
      return { label: t(handoverLabelKey(order.type)), onClick: onComplete };
    }
    return null;
  }, [onComplete, onMarkReady, onStartPreparing, order, t]);

  return {
    open: input.orderId !== null && !input.isAddingItems,
    onOpenChange: (open: boolean) => {
      if (!open) {
        input.onClose();
      }
    },
    order,
    isFetching,
    orderLoadFailed,
    itemRows,
    tableLabel,
    canAddItems,
    canPay,
    canCancel,
    nextStatusAction,
    isAddingItems: input.isAddingItems,
    startAddItems: () => {
      if (order) {
        input.onStartAddItems(order.id);
      }
    },
    cancelAddItems: () => {
      input.clearAdditionLines();
      input.onExitAddItems();
    },
    submitAdditions,
    addingItems: addState.isLoading,
    voidDialog: {
      open: voidItemId !== null,
      ...voidDialog,
    },
    cancelDialog: {
      open: cancelOpen,
      ...cancelDialog,
    },
    openCancelDialog: () => {
      setCancelOpen(true);
    },
    printReceipt,
    announceReleasedAdditions,
    printKitchenFull: () => {
      if (order) {
        printKitchenTicket(order, activeOrderItems(order), false);
      }
    },
    refetchOrder: () => refetch(),
    completeHandover,
    statusChanging: changeState.isLoading || handover.isLoading,
    formatMinor,
    labels: {
      title: t('pos.orderDetail.title'),
      orderNumber: order
        ? t('pos.result.orderNumber', { number: order.orderNumber })
        : '',
      status: order ? t(`pos.orderStatus.${order.status}`) : '',
      paymentStatus: order ? t(`pos.paymentStatus.${order.paymentStatus}`) : '',
      pay: t('pos.orderDetail.pay'),
      addItems: t('pos.orderDetail.addItems'),
      more: t('pos.orderDetail.more'),
      cancelOrder: t('pos.orderDetail.cancelOrder'),
      printReceipt: t('pos.print.receipt'),
      printKitchen: t('pos.print.kitchen'),
      close: t('pos.actions.close'),
      due: order ? t('pos.payment.due') : '',
      total: t('pos.totals.total'),
    },
  };
}

export type PosOrderDetailViewModel = ReturnType<typeof usePosOrderDetail>;
