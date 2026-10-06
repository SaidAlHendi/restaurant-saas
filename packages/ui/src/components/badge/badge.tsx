import type * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/cn.js';
import { focusRing } from '../../lib/styles.js';

/** Order statuses that have their own badge color. */
export const ORDER_STATUSES = ['new', 'preparing', 'ready', 'completed', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const badgeVariants = cva(
  [
    'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
    '[&>svg]:pointer-events-none [&>svg]:size-3',
    focusRing,
  ],
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground',
        success: 'border-transparent bg-success text-success-foreground',
        warning: 'border-transparent bg-warning text-warning-foreground',
        info: 'border-transparent bg-info text-info-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        // Order statuses (KDS columns, order lists).
        new: 'border-transparent bg-info text-info-foreground',
        preparing: 'border-transparent bg-warning text-warning-foreground',
        ready: 'border-transparent bg-success text-success-foreground',
        completed: 'border-border bg-muted text-muted-foreground',
        cancelled:
          'border-destructive/40 bg-transparent text-destructive line-through decoration-1',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

export function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot : 'span';
  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export interface OrderStatusBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  status: OrderStatus;
  /** Translated status name. */
  label: string;
}

/** Badge colored by order status; a dot keeps it readable for color-blind staff. */
export function OrderStatusBadge({ status, label, ...props }: OrderStatusBadgeProps) {
  return (
    <Badge variant={status} data-status={status} {...props}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </Badge>
  );
}
