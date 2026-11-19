import type * as React from 'react';

import { cn } from '../../lib/cn.js';

export interface AppTopbarProps extends Omit<React.ComponentProps<'header'>, 'title'> {
  /** Small line above the title, e.g. "SAHTAIN / OWNER". */
  breadcrumb?: React.ReactNode;
  title: React.ReactNode;
  /** End side: branch switcher, avatar. */
  actions?: React.ReactNode;
}

/** Desktop page bar: breadcrumb and title on the start side, actions on the end side. */
export function AppTopbar({ breadcrumb, title, actions, className, ...props }: AppTopbarProps) {
  return (
    <header
      data-slot="app-topbar"
      className={cn(
        'hidden h-[5.375rem] shrink-0 items-center justify-between gap-4 border-b bg-background px-8 md:flex',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {breadcrumb ? (
          <p dir="auto" className="truncate text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            {breadcrumb}
          </p>
        ) : null}
        <h1 dir="auto" className="truncate text-2xl font-medium tracking-tight">
          {title}
        </h1>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </header>
  );
}
