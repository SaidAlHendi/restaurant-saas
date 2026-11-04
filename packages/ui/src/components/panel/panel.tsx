import type * as React from 'react';

import { cn } from '../../lib/cn.js';

/** White bordered surface used for dashboard sections. */
export function Panel({ className, ...props }: React.ComponentProps<'section'>) {
  return (
    <section
      data-slot="panel"
      className={cn('flex flex-col gap-4 rounded-lg border bg-card p-5 text-card-foreground', className)}
      {...props}
    />
  );
}

export interface PanelHeaderProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Link or button at the end of the header. */
  action?: React.ReactNode;
}

export function PanelHeader({ title, description, action, className, ...props }: PanelHeaderProps) {
  return (
    <div
      data-slot="panel-header"
      className={cn('flex items-start justify-between gap-3', className)}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
