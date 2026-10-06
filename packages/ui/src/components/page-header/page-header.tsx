import type * as React from 'react';
import { ChevronRightIcon } from 'lucide-react';

import { cn } from '../../lib/cn.js';

export interface PageHeaderProps extends Omit<React.ComponentProps<'header'>, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Buttons at the end of the header (e.g. "Add product"). */
  actions?: React.ReactNode;
  /** Pass links (router <Link>) or text; the last one is the current page. */
  breadcrumbs?: React.ReactNode[];
  /** Accessible name for the breadcrumb nav (already translated). */
  breadcrumbLabel?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  breadcrumbLabel,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header data-slot="page-header" className={cn('flex flex-col gap-3', className)} {...props}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label={breadcrumbLabel}>
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <li key={index} className="inline-flex items-center gap-1.5">
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className={cn(isLast ? 'text-foreground' : '[&_a:hover]:text-foreground')}
                  >
                    {crumb}
                  </span>
                  {isLast ? null : (
                    <ChevronRightIcon className="size-3.5 rtl:rotate-180" aria-hidden />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
