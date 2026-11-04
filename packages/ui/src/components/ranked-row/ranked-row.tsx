import type * as React from 'react';

import { cn } from '../../lib/cn.js';

export interface RankedRowProps extends React.ComponentProps<'div'> {
  rank: number;
  title: string;
  subtitle?: string;
  /** Already formatted, e.g. "82". */
  count: React.ReactNode;
  /** Already formatted money. */
  amount: React.ReactNode;
}

/** Ranked list row: number chip, name, count and amount (popular products). */
export function RankedRow({ rank, title, subtitle, count, amount, className, ...props }: RankedRowProps) {
  return (
    <div
      data-slot="ranked-row"
      className={cn('flex items-center gap-3 border-b py-3 last:border-b-0', className)}
      {...props}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent-2/15 text-xs font-bold text-accent-2 tabular-nums">
        {rank}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold">{title}</span>
        {subtitle ? <span className="truncate text-xs text-muted-foreground">{subtitle}</span> : null}
      </span>
      <span className="text-sm font-semibold text-primary tabular-nums">{count}</span>
      <span className="min-w-16 text-end text-xs text-muted-foreground tabular-nums">{amount}</span>
    </div>
  );
}
