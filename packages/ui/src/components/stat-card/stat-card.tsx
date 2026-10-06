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
  className,
  ...props
}: StatCardProps) {
  const good = trend === 'flat' ? null : (trend === 'up') !== invertTrendColor;
  const TrendIcon = trendIcon[trend];
  return (
    <div
      data-slot="stat-card"
      className={cn(
        'flex flex-col gap-2 rounded-xl border bg-card p-5 text-card-foreground shadow-sm',
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{label}</span>
        {icon ? (
          <span className="[&_svg]:size-4" aria-hidden>
            {icon}
          </span>
        ) : null}
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
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
