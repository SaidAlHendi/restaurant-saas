import { ChefHatIcon, CircleCheckBigIcon, ClockIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge, type OrderStatus } from '../badge/index.js';
import { cn } from '../../lib/cn.js';

export type KdsColumnProps = {
  title: string;
  count: number;
  /** Badge color of the column header. */
  status: Extract<OrderStatus, 'new' | 'preparing' | 'ready'>;
  emptyLabel: string;
  children?: ReactNode;
  className?: string;
};

/** One KDS column: header with count, cards scroll inside the column. */
export function KdsColumn({
  title,
  count,
  status,
  emptyLabel,
  children,
  className,
}: KdsColumnProps) {
  const isEmpty = count === 0;
  const EmptyIcon = { new: ChefHatIcon, preparing: ClockIcon, ready: CircleCheckBigIcon }[status];
  return (
    <section
      aria-label={title}
      className={cn('flex min-h-0 flex-col rounded-[2rem] bg-accent-2/25', className)}
    >
      <header className="flex items-center justify-between gap-2 px-4 pt-4 pb-2 max-md:hidden">
        <h2 className="text-base font-bold tracking-tight">{title}</h2>
        <Badge variant={status} className="text-sm tabular-nums">
          {count}
        </Badge>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pt-1 pb-3">
        {isEmpty ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center text-sm">
            <EmptyIcon className="size-6 opacity-60" aria-hidden />
            <p>{emptyLabel}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
