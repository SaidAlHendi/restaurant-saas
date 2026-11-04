import type * as React from 'react';
import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react';

import { cn } from '../../lib/cn.js';

export interface StatCardProps extends React.ComponentProps<'div'> {
  label: React.ReactNode;
  /** Already formatted by the caller (formatMoney, Intl.NumberFormat). */
  value: React.ReactNode;
  /** Already formatted change, e.g. "+12%" or "−3 orders". */
  delta?: React.ReactNode;
  trend?: 'up' | 'down' | 'flat';
  /** Set when "down" is good (e.g. cancellations, prep time). */
  invertTrendColor?: boolean;
  /** Text after the delta, e.g. "vs yesterday". */
  deltaHint?: React.ReactNode;
  icon?: React.ReactNode;
  /** Fills the card with the brand color; use for the one headline number. */
  emphasis?: boolean;
}

const trendIcon = { up: TrendingUpIcon, down: TrendingDownIcon, flat: MinusIcon } as const;

/** KPI tile for the dashboard (today's sales, orders, average ticket). */
export function StatCard({
  label,
  value,
  delta,
  trend = 'flat',
  invertTrendColor = false,
  deltaHint,
  icon,
  emphasis = false,
  className,
  ...props
}: StatCardProps) {
  const good = trend === 'flat' ? null : (trend === 'up') !== invertTrendColor;
  const TrendIcon = trendIcon[trend];
  return (
    <div
      data-slot="stat-card"
      className={cn(
        'flex flex-col gap-3 rounded-2xl border p-5 shadow-sm',
        emphasis
          ? 'border-transparent bg-primary text-primary-foreground'
          : 'bg-card text-card-foreground',
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        {icon ? (
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5',
              emphasis ? 'bg-primary-foreground/15' : 'bg-accent-2/15 text-accent-2',
            )}
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
        <span
          className={cn(
            'text-sm font-medium',
            emphasis ? 'text-primary-foreground/85' : 'text-muted-foreground',
          )}
        >
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold tracking-tight whitespace-nowrap tabular-nums">{value}</div>
      {delta ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span
            data-trend={trend}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium',
              good === null && 'bg-muted text-muted-foreground',
              good === true && 'bg-success/15 text-foreground',
              good === false && 'bg-destructive/15 text-foreground',
            )}
          >
            <TrendIcon
              className={cn(
                'size-3.5',
                good === true && 'text-success',
                good === false && 'text-destructive',
              )}
              aria-hidden
            />
            {delta}
          </span>
          {deltaHint ? <span className="text-muted-foreground">{deltaHint}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
