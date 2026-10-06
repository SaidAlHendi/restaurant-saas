import type * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';

import { cn } from '../../lib/cn.js';
import { overlay } from '../../lib/styles.js';
import { Button } from '../button/button.js';

export interface ConfirmDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Optional element that opens the dialog (rendered with asChild). */
  trigger?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  variant?: 'default' | 'destructive';
  /** The dialog stays open; the caller closes it (onOpenChange(false)) when the action succeeds. */
  onConfirm: () => void;
  /** Shows a spinner on confirm and blocks closing while the action runs. */
  isConfirming?: boolean;
}

/** Asks before an action (cancel order, delete product). Uses role="alertdialog". */
export function ConfirmDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'default',
  onConfirm,
  isConfirming = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!isConfirming) onOpenChange?.(next);
      }}
    >
      {trigger ? <AlertDialogPrimitive.Trigger asChild>{trigger}</AlertDialogPrimitive.Trigger> : null}
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay data-slot="confirm-dialog-overlay" className={overlay} />
        <AlertDialogPrimitive.Content
          data-slot="confirm-dialog-content"
          className={cn(
            'fixed inset-0 z-50 m-auto grid h-fit w-full max-w-[calc(100%-2rem)] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 sm:max-w-md',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          )}
        >
          <div className="flex flex-col gap-2 text-center sm:text-start">
            <AlertDialogPrimitive.Title className="text-lg font-semibold">
              {title}
            </AlertDialogPrimitive.Title>
            {description ? (
              <AlertDialogPrimitive.Description className="text-sm text-muted-foreground">
                {description}
              </AlertDialogPrimitive.Description>
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="outline" disabled={isConfirming}>
                {cancelLabel}
              </Button>
            </AlertDialogPrimitive.Cancel>
            <Button
              variant={variant === 'destructive' ? 'destructive' : 'default'}
              isLoading={isConfirming}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
