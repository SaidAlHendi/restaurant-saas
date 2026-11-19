import type * as React from 'react';

import { cn } from '../../lib/cn.js';

export interface OpsRowProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  icon: React.ReactNode;
  title: React.ReactNode;
  hint?: React.ReactNode;
  /** Number, text or a Badge. */
  value?: React.ReactNode;
}

/** Icon, title with hint and a trailing value (live operations list). */
export function OpsRow({ icon, title, hint, value, className, ...props }: OpsRowProps) {
  return (
    <div
      data-slot="ops-row"
      className={cn('flex items-center gap-3 border-b py-3 last:border-b-0', className)}
      {...props}
    >
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-2/10 text-accent-2 [&_svg]:size-[1.0625rem]"
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold">{title}</span>
        {hint ? <span className="truncate text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      {value !== undefined ? <span className="text-sm font-bold tabular-nums">{value}</span> : null}
    </div>
  );
}
