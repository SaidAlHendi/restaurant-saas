import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '@app/ui';

import type { PosOrderActionDialogViewModel } from '../hooks/use-pos-order-action-dialog.js';
import { PosPinPadView } from './PosPinPadView.js';

export function PosOrderActionDialogView(props: PosOrderActionDialogViewModel & { open: boolean }) {
  const {
    open,
    step,
    reason,
    onReasonChange,
    approvers,
    pinPad,
    errorMessage,
    lockCountdown,
    onPrimary,
    primaryDisabled,
    primaryLabel,
    title,
    reasonLabel,
    cancelLabel,
    onCancel,
    isConfirming,
    labels,
  } = props;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isConfirming) {
          onCancel();
        }
      }}
    >
      <DialogContent size="sm" closeLabel={cancelLabel}>
        <DialogHeader>
          <DialogTitle>{step === 'reason' ? title : labels.approvalTitle}</DialogTitle>
        </DialogHeader>
        {step === 'reason' ? (
          <Textarea
            value={reason}
            onChange={(event) => {
              onReasonChange(event.target.value);
            }}
            placeholder={reasonLabel}
            rows={3}
          />
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">{labels.approvalHint}</p>
            <p className="text-sm font-medium">{labels.pickApprover}</p>
            {approvers.length === 0 ? (
              <p className="text-muted-foreground text-sm">{labels.emptyApprovers}</p>
            ) : (
              <ul className="grid gap-2">
                {approvers.map((user) => (
                  <li key={user.membershipId}>
                    <button
                      type="button"
                      className={`border-border hover:bg-accent w-full rounded-lg border p-2 text-start text-sm ${user.selected ? 'border-primary bg-accent ring-primary ring-2' : ''}`}
                      onClick={user.onSelect}
                    >
                      <span className="font-medium">{user.name}</span>
                      <span className="text-muted-foreground ms-2 text-xs">{user.roleLabel}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {lockCountdown !== null ? (
              <p className="text-destructive text-sm">
                {labels.locked} {lockCountdown}
              </p>
            ) : null}
            {errorMessage !== null && lockCountdown === null ? (
              <p className="text-destructive text-sm">{errorMessage}</p>
            ) : null}
            <PosPinPadView
              digits={pinPad.digits}
              canSubmit={!primaryDisabled}
              submitting={isConfirming}
              onDigit={pinPad.onDigit}
              onBackspace={pinPad.onBackspace}
              onSubmit={onPrimary}
              labels={{ backspace: labels.backspace, submit: primaryLabel }}
            />
          </div>
        )}
        {step === 'reason' && errorMessage !== null ? (
          <p className="text-destructive text-sm">{errorMessage}</p>
        ) : null}
        {step === 'reason' ? (
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isConfirming} onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={primaryDisabled}
              isLoading={isConfirming}
              onClick={() => {
                onPrimary();
              }}
            >
              {primaryLabel}
            </Button>
          </DialogFooter>
        ) : (
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isConfirming} onClick={onCancel}>
              {cancelLabel}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
