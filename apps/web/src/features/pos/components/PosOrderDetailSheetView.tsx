import {
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
import { posActionMaps } from '../pos-action-maps.js';
import { PosOrderActionBarView } from './PosOrderActionBarView.js';
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
    reopen,
    voidDialog,
    cancelDialog,
    statusChanging,
    labels,
    onPay,
  } = props;

  const { run, actionLabel } = posActionMaps(props, onPay);

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
                timeline={{ collapsible: true, onToggle: timeline.onToggle, loading: timeline.loading }}
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
              <PosOrderActionBarView
                layout={layout}
                run={run}
                actionLabel={actionLabel}
                busy={statusChanging}
                labels={{ more: labels.more, moreActions: labels.moreActions, manager: labels.manager }}
              />
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
