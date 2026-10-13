import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { OrderStatus, PosMenuPayload } from '@app/shared';

import { openPrintWindow } from '../../../lib/print/open-print-window.js';
import { printLocaleFromUi } from '../../../lib/print/print-document.js';
import {
  kitchenItemsToPrint,
  markKitchenItemsPrinted,
} from '../../../lib/print/kitchen-addition-diff.js';
import { renderKitchenHtml } from '../../../lib/print/kitchen-html.js';
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
  nextOrderStatusTarget,
} from '../pos-order-detail.utils.js';
import { usePosOrderActionDialog } from './use-pos-order-action-dialog.js';

export function usePosOrderDetail(input: {
  branchId: string | null;
  orderId: string | null;
  onClose: () => void;
  menu: PosMenuPayload | undefined;
  tableLabelById: Map<string, string>;
  locale: string;
  defaultLocale: string;
  formatMinor: (minor: number) => string;
  additionLines: CartLine[];
  clearAdditionLines: () => void;
  isAddingItems: boolean;
  setIsAddingItems: (value: boolean) => void;
  canCancelOrders: boolean;
  canCreateOrders: boolean;
}) {
  const { t } = useTranslation();
  const [voidItemId, setVoidItemId] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const skip = !input.branchId || !input.orderId;
  const { data: order, refetch, isFetching } = useGetOrderQuery(
    { branchId: input.branchId ?? '', orderId: input.orderId ?? '' },
    { skip },
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
      if (to === 'completed' || to === 'cancelled') {
        input.onClose();
      }
    },
    [changeStatus, handleConflict, input, order],
  );

  const onComplete = useCallback(() => {
    void runStatusChange('completed');
  }, [runStatusChange]);

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
    input.clearAdditionLines();
    input.setIsAddingItems(false);
  }, [addItems, handleConflict, input, order]);

  const printReceipt = useCallback(() => {
    if (!order || !input.menu) {
      return;
    }
    const html = renderReceiptHtml({
      order,
      menu: input.menu,
      tableLabel,
      locale: input.locale,
      fallbackLocale: input.defaultLocale,
      formatMinor: input.formatMinor,
      printedAt: new Date(),
      labels: {
        subtotal: t('pos.totals.subtotal'),
        tax: t('pos.totals.tax'),
        taxInclusiveSuffix: input.menu.branch.taxInclusive ? t('pos.print.taxInclSuffix') : '',
        total: t('pos.totals.total'),
        orderNumber: t('pos.result.orderNumber', { number: order.orderNumber }),
        dineIn: t('pos.orderType.dineIn'),
        takeaway: t('pos.orderType.takeaway'),
        paymentMethodCash: t('pos.payment.methodCash'),
        paymentMethodCard: t('pos.payment.methodCard'),
        paymentMethodOther: t('pos.payment.methodOther'),
        tendered: t('pos.payment.tendered'),
        change: t('pos.payment.change'),
      },
    });
    openPrintWindow(t('pos.print.receiptTitle'), html, printLocaleFromUi(input.locale));
  }, [input, order, t, tableLabel]);

  const printKitchen = useCallback(
    (additionsOnly: boolean) => {
      if (!order) {
        return;
      }
      const items = kitchenItemsToPrint(order, { additionsOnly });
      if (items.length === 0) {
        return;
      }
      const html = renderKitchenHtml({
        order,
        items,
        tableLabel,
        locale: input.locale,
        fallbackLocale: input.defaultLocale,
        timeZone: input.menu?.branch.timezone ?? 'UTC',
        printedAt: new Date(),
        title: additionsOnly ? t('pos.print.kitchenAdditionTitle') : t('pos.print.kitchenTitle'),
        isAdditionTicket: additionsOnly,
        labels: {
          dineIn: t('pos.orderType.dineIn'),
          takeaway: t('pos.orderType.takeaway'),
          additionHeader: t('pos.print.kitchenAdditionTitle'),
        },
      });
      openPrintWindow(t('pos.print.kitchenTitle'), html, printLocaleFromUi(input.locale));
      markKitchenItemsPrinted(order, items);
    },
    [input, order, t, tableLabel],
  );

  const itemRows = useMemo(() => {
    if (!order) {
      return [];
    }
    return order.items.map((item) => ({
      id: item.id,
      name: posLocalizedName(item.productNameSnapshot, input.locale, input.defaultLocale),
      quantity: item.quantity,
      lineTotalLabel: input.formatMinor(item.lineTotalMinor),
      voided: item.status === 'voided',
      isAddition: item.isAddition,
      onVoid: canVoidOrderItem(order, item.status === 'voided')
        ? () => {
            setVoidItemId(item.id);
          }
        : undefined,
      voidLabel: t('pos.orderDetail.voidItem'),
    }));
  }, [input, order, t]);

  const canAddItems =
    order !== undefined &&
    (order.status === 'placed' || order.status === 'preparing') &&
    !input.isAddingItems;

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
      return { label: t('pos.orderDetail.complete'), onClick: onComplete };
    }
    return null;
  }, [onComplete, onMarkReady, onStartPreparing, order, t]);

  return {
    open: input.orderId !== null,
    onOpenChange: (open: boolean) => {
      if (!open) {
        input.onClose();
        input.setIsAddingItems(false);
        input.clearAdditionLines();
      }
    },
    order,
    isFetching,
    itemRows,
    tableLabel,
    canAddItems,
    canPay,
    canCancel,
    nextStatusAction,
    isAddingItems: input.isAddingItems,
    startAddItems: () => {
      input.setIsAddingItems(true);
    },
    cancelAddItems: () => {
      input.setIsAddingItems(false);
      input.clearAdditionLines();
    },
    submitAdditions,
    addingItems: addState.isLoading,
    additionCount: input.additionLines.length,
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
    printKitchenFull: () => {
      printKitchen(false);
    },
    printKitchenAddition: () => {
      printKitchen(true);
    },
    refetchOrder: () => refetch(),
    statusChanging: changeState.isLoading,
    formatMinor: input.formatMinor,
    labels: {
      title: t('pos.orderDetail.title'),
      orderNumber: order
        ? t('pos.result.orderNumber', { number: order.orderNumber })
        : '',
      status: order ? t(`pos.orderStatus.${order.status}`) : '',
      paymentStatus: order ? t(`pos.paymentStatus.${order.paymentStatus}`) : '',
      pay: t('pos.orderDetail.pay'),
      addItems: t('pos.orderDetail.addItems'),
      sendAdditions: t('pos.orderDetail.sendAdditions'),
      cancelOrder: t('pos.orderDetail.cancelOrder'),
      printReceipt: t('pos.print.receipt'),
      printKitchen: t('pos.print.kitchen'),
      printKitchenAddition: t('pos.print.kitchenAddition'),
      close: t('pos.actions.close'),
      due: order ? t('pos.payment.due') : '',
      total: t('pos.totals.total'),
    },
  };
}

export type PosOrderDetailViewModel = ReturnType<typeof usePosOrderDetail>;
