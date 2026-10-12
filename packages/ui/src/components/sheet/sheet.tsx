import type * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { cva } from 'class-variance-authority';

import { cn } from '../../lib/cn.js';
import {
  overlay,
  overlayBody,
  overlayDescription,
  overlayFooter,
  overlayHeader,
  overlayTitle,
} from '../../lib/styles.js';
import { OverlayCloseButton } from '../dialog/dialog.js';

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;

// start/end follow the reading direction: `end` is the right edge in English and the left edge in Arabic.
const sheetVariants = cva(
  'fixed z-50 flex flex-col overflow-hidden bg-background shadow-xl transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
  {
    variants: {
      side: {
        start:
          'inset-y-0 start-0 h-full w-full border-e data-[state=closed]:slide-out-to-start data-[state=open]:slide-in-from-start',
        end: 'inset-y-0 end-0 h-full w-full border-s data-[state=closed]:slide-out-to-end data-[state=open]:slide-in-from-end',
        top: 'inset-x-0 top-0 max-h-[90dvh] rounded-b-2xl border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom:
          'inset-x-0 bottom-0 max-h-[90dvh] rounded-t-2xl border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
      },
      size: {
        sm: '',
        md: '',
        lg: '',
      },
    },
    compoundVariants: [
      { side: ['start', 'end'], size: 'sm', className: 'sm:max-w-sm' },
      { side: ['start', 'end'], size: 'md', className: 'sm:max-w-md' },
      { side: ['start', 'end'], size: 'lg', className: 'sm:max-w-xl' },
      { side: ['top', 'bottom'], size: 'sm', className: 'mx-auto sm:max-w-lg' },
      { side: ['top', 'bottom'], size: 'md', className: 'mx-auto sm:max-w-2xl' },
    ],
    defaultVariants: { side: 'end', size: 'md' },
  },
);

export interface SheetContentProps extends React.ComponentProps<typeof SheetPrimitive.Content> {
  side?: 'start' | 'end' | 'top' | 'bottom';
  /** Width of a start/end sheet (or of a top/bottom sheet from `sm` up); `lg` is for long forms. */
  size?: 'sm' | 'md' | 'lg';
  /** Accessible label for the X button (already translated). The button is hidden without it. */
  closeLabel?: string;
}

/**
 * Compose as SheetHeader (title, description) + SheetBody (fields) + SheetFooter (actions).
 * A form that wraps body and footer should use `className="contents"` so the layout still applies.
 */
export function SheetContent({
  className,
  children,
  side = 'end',
  size = 'md',
  closeLabel,
  ...props
}: SheetContentProps) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay data-slot="sheet-overlay" className={overlay} />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(sheetVariants({ side, size }), className)}
        {...props}
      >
        {children}
        {closeLabel ? <OverlayCloseButton label={closeLabel} /> : null}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-header" className={cn(overlayHeader, className)} {...props} />;
}

/** Scrolling middle part with the standard padding and gap between fields. */
export function SheetBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-body" className={cn(overlayBody, className)} {...props} />;
}

export function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-footer" className={cn(overlayFooter, className)} {...props} />;
}

export function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(overlayTitle, className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn(overlayDescription, className)}
      {...props}
    />
  );
}
