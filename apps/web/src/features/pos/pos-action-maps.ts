import type { PosOrderDetailViewModel } from './hooks/use-pos-order-detail.js';
import type { PosDetailAction } from './pos-order-detail.utils.js';

/** What each action does and is called, taken from the order-detail hook. Pay is supplied by the page. */
export function posActionMaps(
  pos: PosOrderDetailViewModel,
  onPay: () => void,
): { run: Record<PosDetailAction, () => void>; actionLabel: Record<PosDetailAction, string> } {
  const { labels } = pos;
  return {
    run: {
      pay: onPay,
      startPreparing: pos.onStartPreparing,
      markReady: pos.onMarkReady,
      handover: pos.onComplete,
      addItems: pos.startAddItems,
      printReceipt: () => {
        pos.printReceipt();
      },
      printKitchen: pos.printKitchenFull,
      cancel: pos.openCancelDialog,
      reopen: pos.reopen.openDialog,
    },
    actionLabel: {
      pay: labels.pay,
      startPreparing: labels.startPreparing,
      markReady: labels.markReady,
      handover: labels.handover,
      addItems: labels.addItems,
      printReceipt: labels.printReceipt,
      printKitchen: labels.printKitchen,
      cancel: labels.cancelOrder,
      reopen: pos.reopen.labels.action,
    },
  };
}
