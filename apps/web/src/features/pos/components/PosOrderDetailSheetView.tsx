import { EllipsisIcon } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@app/ui';

import { OrderDetailsBodyView, OrderDetailsSkeletonView } from '../../orders/components/order-details/OrderDetailsBodyView.js';
import { OrderDetailsHeaderView } from '../../orders/components/order-details/OrderDetailsHeaderView.js';
import type { PosOrderDetailViewModel } from '../hooks/use-pos-order-detail.js';
import type { PosDetailAction } from '../pos-order-detail.utils.js';
import { PosOrderActionDialogView } from './PosOrderActionDialogView.js';
import { PosReopenDialogView } from './PosReopenDialogView.js';

export type PosOrderDetailSheetViewProps = PosOrderDetailViewModel & {
  onPay: () => void;
};

export function PosOrderDetailSheetView(props: PosOrderDetailSheetViewProps) {
  const {
    open,
    onOpenChange,
    order,
    orderLoadFailed,
    details,
    layout,
    timeline,
    startAddItems,
    reopen,
    voidDialog,
    cancelDialog,
    openCancelDialog,
    printReceipt,
    printKitchenFull,
    onStartPreparing,
    onMarkReady,
    onComplete,
    statusChanging,
    labels,
    onPay,
  } = props;

  const run: Record<PosDetailAction, () => void> = {
    pay: onPay,
    startPreparing: onStartPreparing,
    markReady: onMarkReady,
    handover: onComplete,
    addItems: startAddItems,
    printReceipt: () => {
      printReceipt();
    },
    printKitchen: printKitchenFull,
    cancel: openCancelDialog,
    reopen: reopen.openDialog,
  };
  const actionLabel: Record<PosDetailAction, string> = {
    pay: labels.pay,
    startPreparing: labels.startPreparing,
    markReady: labels.markReady,
    handover: labels.handover,
    addItems: labels.addItems,
    printReceipt: labels.printReceipt,
    printKitchen: labels.printKitchen,
    cancel: labels.cancelOrder,
    reopen: reopen.labels.action,
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="end"
          size="lg"
          closeLabel={labels.close}
          className="sm:max-w-3xl lg:max-w-5xl"
        >
          <SheetHeader className="border-b">
            <SheetTitle className="sr-only">{labels.title}</SheetTitle>
            {order && details ? (
              <OrderDetailsHeaderView
                header={details.header}
                stepper={details.stepper}
                labels={{
                  orderNumber: labels.orderNumber,
                  progress: labels.progress,
                  business: labels.business,
                  created: labels.created,
                  due: labels.dueLabel,
                }}
                className="pe-8"
              />
            ) : null}
          </SheetHeader>
          <SheetBody>
            {order && details ? (
              <OrderDetailsBodyView
                model={details}
                labels={labels}
                timeline={{ collapsible: true, loading: timeline.loading }}
              />
            ) : orderLoadFailed ? (
              <p role="alert" className="text-destructive text-sm">
                {labels.loadFailed}
              </p>
            ) : (
              <OrderDetailsSkeletonView label={labels.loading} />
            )}
          </SheetBody>
          {order && layout ? (
            <SheetFooter className="flex-col gap-2 border-t sm:flex-col sm:justify-start">
              {layout.primary ? (
                <Button
                  type="button"
                  size="touch"
                  className="w-full text-base"
                  disabled={statusChanging}
                  onClick={run[layout.primary]}
                >
                  {actionLabel[layout.primary]}
                </Button>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {layout.secondary.map((action) => (
                  <Button
                    key={action}
                    type="button"
                    size="touch"
                    variant="outline"
                    className="min-w-0 flex-1"
                    disabled={statusChanging}
                    onClick={run[action]}
                  >
                    {actionLabel[action]}
                  </Button>
                ))}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      size="touch"
                      variant="ghost"
                      className="flex-none"
                      aria-label={labels.moreActions}
                    >
                      <EllipsisIcon aria-hidden />
                      {labels.more}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-56">
                    {layout.more.map((action) => (
                      <DropdownMenuItem key={action} className="min-h-11" onClick={run[action]}>
                        {actionLabel[action]}
                      </DropdownMenuItem>
                    ))}
                    {layout.manager.length > 0 ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>{labels.manager}</DropdownMenuLabel>
                        {layout.manager.map((action) => (
                          <DropdownMenuItem key={action} className="min-h-11" onClick={run[action]}>
                            {actionLabel[action]}
                          </DropdownMenuItem>
                        ))}
                      </>
                    ) : null}
                    {layout.destructive.length > 0 ? (
                      <>
                        <DropdownMenuSeparator />
                        {layout.destructive.map((action) => (
                          <DropdownMenuItem
                            key={action}
                            className="text-destructive min-h-11"
                            onClick={run[action]}
                          >
                            {actionLabel[action]}
                          </DropdownMenuItem>
                        ))}
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>
      <PosOrderActionDialogView {...voidDialog} />
      <PosOrderActionDialogView {...cancelDialog} />
      <PosReopenDialogView {...reopen} />
    </>
  );
}
