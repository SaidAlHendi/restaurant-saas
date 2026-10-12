import type * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';

import { cn } from '../../lib/cn.js';
import {
  focusRing,
  overlay,
  overlayBody,
  overlayDescription,
  overlayFooter,
  overlayHeader,
  overlayTitle,
} from '../../lib/styles.js';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

export function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(overlay, className)}
      {...props}
    />
  );
}

/** Close (X) button shared by Dialog and Sheet; sits in the header row. */
export function OverlayCloseButton({ label }: { label: string }) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      className={cn(
        'absolute end-4 top-3.5 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        focusRing,
      )}
    >
      <XIcon aria-hidden />
      <span className="sr-only">{label}</span>
    </DialogPrimitive.Close>
  );
}

const dialogSizes = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
} as const;

export interface DialogContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  /** Accessible label for the X button (already translated). The button is hidden without it. */
  closeLabel?: string;
  /** Width on screens from `sm` up. Phones always get the full width minus a margin. */
  size?: keyof typeof dialogSizes;
}

/**
 * Compose as DialogHeader (title, description) + DialogBody (fields) + DialogFooter (actions).
 * A form that wraps body and footer should use `className="contents"` so the layout still applies.
 */
export function DialogContent({
  className,
  children,
  closeLabel,
  size = 'md',
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // Centered with inset + margin (not left/translate) so it is direction-neutral.
          'fixed inset-0 z-50 m-auto flex h-fit max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-xl border bg-background shadow-xl duration-200',
          dialogSizes[size],
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          className,
        )}
        {...props}
      >
        {children}
        {closeLabel ? <OverlayCloseButton label={closeLabel} /> : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-header" className={cn(overlayHeader, className)} {...props} />;
}

/** Scrolling middle part with the standard padding and gap between fields. */
export function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-body" className={cn(overlayBody, className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-footer" className={cn(overlayFooter, className)} {...props} />;
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(overlayTitle, className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(overlayDescription, className)}
      {...props}
    />
  );
}
