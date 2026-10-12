import {
  Badge,
  Button,
  ConfirmDialog,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@app/ui';

import type { PosOrderDetailViewModel } from '../hooks/use-pos-order-detail.js';

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
    isAddingItems,
    startAddItems,
    cancelAddItems,
    submitAdditions,
    addingItems,
    additionCount,
    voidDialog,
    cancelDialog,
    openCancelDialog,
    printReceipt,
    printKitchenFull,
    printKitchenAddition,
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
                    {formatMinor(order.totalMinor)}
                  </dd>
                  {order.dueMinor > 0 ? (
                    <>
                      <dt className="text-muted-foreground">{labels.due}</dt>
                      <dd className="text-end font-semibold tabular-nums">
                        {formatMinor(order.dueMinor)}
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
                {isAddingItems ? (
                  <p className="text-muted-foreground text-sm">
                    {labels.sendAdditions} ({String(additionCount)})
                  </p>
                ) : null}
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
                {canAddItems && !isAddingItems ? (
                  <Button type="button" size="touch" variant="outline" onClick={startAddItems}>
                    {labels.addItems}
                  </Button>
                ) : null}
                {isAddingItems ? (
                  <>
                    <Button type="button" size="touch" variant="outline" onClick={cancelAddItems}>
                      {labels.close}
                    </Button>
                    <Button
                      type="button"
                      size="touch"
                      disabled={additionCount === 0}
                      isLoading={addingItems}
                      onClick={() => {
                        void submitAdditions();
                      }}
                    >
                      {labels.sendAdditions}
                    </Button>
                  </>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={printReceipt}>
                    {labels.printReceipt}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={printKitchenFull}>
                    {labels.printKitchen}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={printKitchenAddition}>
                    {labels.printKitchenAddition}
                  </Button>
                </div>
                {canCancel ? (
                  <Button type="button" size="sm" variant="destructive" onClick={openCancelDialog}>
                    {labels.cancelOrder}
                  </Button>
                ) : null}
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={voidDialog.open}
        title={voidDialog.title}
        description={
          <Textarea
            value={voidDialog.reason}
            onChange={(event) => {
              voidDialog.onReasonChange(event.target.value);
            }}
            placeholder={voidDialog.reasonLabel}
            rows={3}
          />
        }
        confirmLabel={voidDialog.confirmLabel}
        cancelLabel={voidDialog.cancelLabel}
        onConfirm={voidDialog.onConfirm}
        isConfirming={voidDialog.submitting}
        onOpenChange={(next) => {
          if (!next) {
            voidDialog.onCancel();
          }
        }}
      />
      <ConfirmDialog
        open={cancelDialog.open}
        title={cancelDialog.title}
        description={
          <Textarea
            value={cancelDialog.reason}
            onChange={(event) => {
              cancelDialog.onReasonChange(event.target.value);
            }}
            placeholder={cancelDialog.reasonLabel}
            rows={3}
          />
        }
        confirmLabel={cancelDialog.confirmLabel}
        cancelLabel={cancelDialog.cancelLabel}
        onConfirm={cancelDialog.onConfirm}
        onOpenChange={(next) => {
          if (!next) {
            cancelDialog.onCancel();
          }
        }}
      />
    </>
  );
}
