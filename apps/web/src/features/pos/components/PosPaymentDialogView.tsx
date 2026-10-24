import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  MoneyInput,
} from '@app/ui';

import type { usePosPaymentDialog } from '../hooks/use-pos-payment-dialog.js';

type PaymentVm = ReturnType<typeof usePosPaymentDialog>;

export type PosPaymentDialogViewProps = PaymentVm;

export function PosPaymentDialogView(props: PosPaymentDialogViewProps) {
  const {
    open,
    close,
    method,
    setMethod,
    tenderedMinor,
    setTenderedMinor,
    quickAmounts,
    changeLabel,
    dueLabel,
    canSubmit,
    submitting,
    submit,
    currency,
    uiLocale,
    labels,
    showCard,
  } = props;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          close();
        }
      }}
    >
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-muted-foreground text-sm">
            {labels.due}:{' '}
            <span className="text-foreground font-semibold tabular-nums">{dueLabel}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="touch"
              variant={method === 'cash' ? 'default' : 'outline'}
              onClick={() => {
                setMethod('cash');
              }}
            >
              {labels.methodCash}
            </Button>
            {showCard ? (
              <Button
                type="button"
                size="touch"
                variant={method === 'card' ? 'default' : 'outline'}
                onClick={() => {
                  setMethod('card');
                }}
              >
                {labels.methodCard}
              </Button>
            ) : null}
          </div>
          {method === 'cash' ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="pos-tendered">{labels.tendered}</Label>
                <MoneyInput
                  id="pos-tendered"
                  currency={currency}
                  locale={uiLocale}
                  size="touch"
                  value={tenderedMinor}
                  onValueChange={setTenderedMinor}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((amount) => (
                  <Button
                    key={String(amount)}
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="min-h-12"
                    onClick={() => {
                      setTenderedMinor(amount);
                    }}
                  >
                    {props.formatMinorLabel(amount)}
                  </Button>
                ))}
              </div>
              {changeLabel ? (
                <p className="text-sm">
                  {labels.change}: <span className="font-semibold tabular-nums">{changeLabel}</span>
                </p>
              ) : null}
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" size="touch" onClick={close}>
            {labels.cancel}
          </Button>
          <Button
            type="button"
            size="touch"
            disabled={!canSubmit}
            isLoading={submitting}
            onClick={() => {
              void submit();
            }}
          >
            {labels.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
