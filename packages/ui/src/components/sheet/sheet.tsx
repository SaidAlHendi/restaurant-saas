import type * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { cva } from 'class-variance-authority';

import { cn } from '../../lib/cn.js';
import { overlay } from '../../lib/styles.js';
import { OverlayCloseButton } from '../dialog/dialog.js';

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;

// start/end follow the reading direction: `end` is the right edge in English and the left edge in Arabic.
const sheetVariants = cva(
  'fixed z-50 flex flex-col gap-4 bg-background shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
  {
    variants: {
      side: {
        start:
          'inset-y-0 start-0 h-full w-3/4 border-e sm:max-w-sm data-[state=closed]:slide-out-to-start data-[state=open]:slide-in-from-start',
        end: 'inset-y-0 end-0 h-full w-3/4 border-s sm:max-w-sm data-[state=closed]:slide-out-to-end data-[state=open]:slide-in-from-end',
        top: 'inset-x-0 top-0 h-auto border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom:
          'inset-x-0 bottom-0 h-auto border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
      },
    },
    defaultVariants: { side: 'end' },
  },
);

export interface SheetContentProps extends React.ComponentProps<typeof SheetPrimitive.Content> {
  side?: 'start' | 'end' | 'top' | 'bottom';
  /** Accessible label for the X button (already translated). The button is hidden without it. */
  closeLabel?: string;
}

export function SheetContent({
  className,
  children,
  side = 'end',
  closeLabel,
  ...props
}: SheetContentProps) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay data-slot="sheet-overlay" className={overlay} />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {children}
        {closeLabel ? <OverlayCloseButton label={closeLabel} /> : null}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="sheet-header" className={cn('flex flex-col gap-1.5 p-4', className)} {...props} />
  );
}

export function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('mt-auto flex flex-col gap-2 p-4', className)}
      {...props}
    />
  );
}

export function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('font-semibold text-foreground', className)}
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
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}
