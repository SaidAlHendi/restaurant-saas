import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@app/ui';

import type { PosOrderDetailViewModel } from '../hooks/use-pos-order-detail.js';
import { PosOrderActionDialogView } from './PosOrderActionDialogView.js';

export type PosOrderDetailSheetViewProps = PosOrderDetailViewModel & {
  onPay: () => void;
};

export function PosOrderDetailSheetView(props: PosOrderDetailSheetViewProps) {
  const {
    open,
    onOpenChange,
    order,
    itemRows,
    canAddItems,
    canPay,
    canCancel,
    nextStatusAction,
    startAddItems,
    voidDialog,
    cancelDialog,
    openCancelDialog,
    printReceipt,
    printKitchenFull,
    labels,
    onPay,
    formatMinor,
  } = props;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="end" size="lg" closeLabel={labels.close}>
          <SheetHeader>
            <SheetTitle>{labels.title}</SheetTitle>
            {order ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-lg font-bold tabular-nums">{labels.orderNumber}</span>
                <Badge>{labels.status}</Badge>
                <Badge variant="outline">{labels.paymentStatus}</Badge>
              </div>
            ) : null}
          </SheetHeader>
          {order ? (
            <>
              <SheetBody>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">{labels.total}</dt>
                  <dd className="text-end font-semibold tabular-nums">
                    {formatMinor(order.totalMinor, 'total')}
                  </dd>
                  {order.dueMinor > 0 ? (
                    <>
                      <dt className="text-muted-foreground">{labels.due}</dt>
                      <dd className="text-end font-semibold tabular-nums">
                        {formatMinor(order.dueMinor, 'total')}
                      </dd>
                    </>
                  ) : null}
                </dl>
                <ul className="space-y-3 border-t pt-4">
                  {itemRows.map((row) => (
                    <li
                      key={row.id}
                      className={`flex items-start justify-between gap-2 text-sm ${row.voided ? 'opacity-50 line-through' : ''}`}
                    >
                      <div>
                        <span className="font-medium">
                          {String(row.quantity)}× {row.name}
                        </span>
                        {row.isAddition ? (
                          <Badge variant="outline" className="ms-2">
                            +
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="tabular-nums">{row.lineTotalLabel}</span>
                        {row.onVoid ? (
                          <Button type="button" size="sm" variant="ghost" onClick={row.onVoid}>
                            {row.voidLabel}
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </SheetBody>
              <SheetFooter className="flex-col sm:flex-col sm:justify-start">
                {canPay ? (
                  <Button type="button" size="touch" onClick={onPay}>
                    {labels.pay}
                  </Button>
                ) : null}
                {nextStatusAction ? (
                  <Button
                    type="button"
                    size="touch"
                    variant="secondary"
                    onClick={nextStatusAction.onClick}
                  >
                    {nextStatusAction.label}
                  </Button>
                ) : null}
                {canAddItems ? (
                  <Button type="button" size="touch" variant="outline" onClick={startAddItems}>
                    {labels.addItems}
                  </Button>
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" size="touch" variant="ghost">
                      {labels.more}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={printReceipt}>{labels.printReceipt}</DropdownMenuItem>
                    <DropdownMenuItem onClick={printKitchenFull}>
                      {labels.printKitchen}
                    </DropdownMenuItem>
                    {canCancel ? (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={openCancelDialog}
                      >
                        {labels.cancelOrder}
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
      <PosOrderActionDialogView {...voidDialog} />
      <PosOrderActionDialogView {...cancelDialog} />
    </>
  );
}
