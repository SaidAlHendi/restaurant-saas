import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { OrderStatus, PosMenuPayload } from '@app/shared';

import { openPrintWindow } from '../../../lib/print/open-print-window.js';
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
import { posLocalizedName } from '../pos-label.utils.js';

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
}) {
  const { t } = useTranslation();
  const [voidItemId, setVoidItemId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
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

  const confirmCancel = useCallback(() => {
    void runStatusChange('cancelled', cancelReason.trim());
    setCancelOpen(false);
    setCancelReason('');
  }, [cancelReason, runStatusChange]);

  const submitVoidItem = useCallback(async () => {
    if (!input.branchId || !order || !voidItemId || voidReason.trim().length === 0) {
      return;
    }
    const result = await voidItem({
      branchId: input.branchId,
      orderId: order.id,
      itemId: voidItemId,
      body: {
        expectedVersion: order.version,
        reason: voidReason.trim(),
      },
    });
    if ('error' in result) {
      handleConflict(result.error);
      return;
    }
    setVoidItemId(null);
    setVoidReason('');
  }, [handleConflict, input.branchId, order, voidItem, voidItemId, voidReason]);

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
        tax: input.menu.branch.taxInclusive ? t('pos.totals.taxIncl') : t('pos.totals.tax'),
        total: t('pos.totals.total'),
        paid: t('pos.print.paid'),
        due: t('pos.print.due'),
      },
    });
    openPrintWindow(t('pos.print.receiptTitle'), html);
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
        title: additionsOnly ? t('pos.print.kitchenAdditionTitle') : t('pos.print.kitchenTitle'),
        isAdditionTicket: additionsOnly,
      });
      openPrintWindow(t('pos.print.kitchenTitle'), html);
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
      onVoid:
        item.status !== 'voided' && order.status !== 'completed' && order.status !== 'cancelled'
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

  const canPay = order !== undefined && order.dueMinor > 0 && order.status !== 'cancelled';

  const nextStatusAction = useMemo(() => {
    if (!order) {
      return null;
    }
    if (order.status === 'placed') {
      return { label: t('pos.orderDetail.markPreparing'), onClick: onStartPreparing };
    }
    if (order.status === 'preparing') {
      return { label: t('pos.orderDetail.markReady'), onClick: onMarkReady };
    }
    if (order.status === 'ready') {
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
      reason: voidReason,
      onReasonChange: setVoidReason,
      onConfirm: () => {
        void submitVoidItem();
      },
      onCancel: () => {
        setVoidItemId(null);
        setVoidReason('');
      },
      submitting: voidState.isLoading,
      title: t('pos.orderDetail.voidTitle'),
      reasonLabel: t('pos.orderDetail.voidReason'),
      confirmLabel: t('pos.orderDetail.voidConfirm'),
      cancelLabel: t('pos.actions.cancel'),
    },
    cancelDialog: {
      open: cancelOpen,
      reason: cancelReason,
      onReasonChange: setCancelReason,
      onConfirm: confirmCancel,
      onCancel: () => {
        setCancelOpen(false);
      },
      title: t('pos.orderDetail.cancelTitle'),
      reasonLabel: t('pos.orderDetail.cancelReason'),
      confirmLabel: t('pos.orderDetail.cancelConfirm'),
      cancelLabel: t('pos.actions.cancel'),
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
    refetchOrder: () => {
      void refetch();
    },
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
