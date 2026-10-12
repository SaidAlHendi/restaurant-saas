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
  return (
    <section
      aria-label={title}
      className={cn('bg-muted/40 flex min-h-0 flex-col rounded-lg border', className)}
    >
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Badge variant={status} className="text-sm tabular-nums">
          {count}
        </Badge>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {isEmpty ? (
          <p className="text-muted-foreground py-8 text-center text-sm">{emptyLabel}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
