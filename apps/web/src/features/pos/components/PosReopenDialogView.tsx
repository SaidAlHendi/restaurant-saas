import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '@app/ui';

import type { PosReopenViewModel } from '../hooks/use-pos-reopen.js';

export function PosReopenDialogView(props: PosReopenViewModel) {
  const { open, close, reason, onReasonChange, confirm, submitting, reasonMax, labels } = props;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !submitting) {
          close();
        }
      }}
    >
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <p className="text-muted-foreground text-sm">{labels.body}</p>
          <Textarea
            value={reason}
            onChange={(event) => {
              onReasonChange(event.target.value);
            }}
            placeholder={labels.reason}
            maxLength={reasonMax}
            rows={3}
          />
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={submitting} onClick={close}>
            {labels.cancel}
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={() => {
              void confirm();
            }}
          >
            {labels.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
