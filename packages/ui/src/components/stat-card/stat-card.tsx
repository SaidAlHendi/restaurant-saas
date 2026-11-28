import type * as React from 'react';
import { ChevronRightIcon, MinusIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react';

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
  /**
   * Marks a card that opens something: brand-coloured label and icon, a chevron, a tinted fill
   * and a brand border. The caller wraps it in a link or button with the `group` class.
   */
  interactive?: boolean;
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
  interactive = false,
  className,
  ...props
}: StatCardProps) {
  const good = trend === 'flat' ? null : (trend === 'up') !== invertTrendColor;
  const TrendIcon = trendIcon[trend];
  return (
    <div
      data-slot="stat-card"
      className={cn(
        '@container flex flex-col gap-2 rounded-lg border p-4 shadow-xs',
        emphasis
          ? 'border-transparent bg-primary text-primary-foreground'
          : 'bg-card text-card-foreground',
        interactive &&
          !emphasis &&
          'border-primary bg-primary/10 group-hover:bg-primary/20 transition-colors',
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            'inline-flex items-center gap-1 text-sm font-medium',
            emphasis
              ? 'text-primary-foreground/85'
              : interactive
                ? 'dark:text-foreground font-semibold text-[color-mix(in_oklab,var(--primary)_80%,var(--foreground))]'
                : 'text-muted-foreground',
          )}
        >
          {label}
          {interactive ? (
            <ChevronRightIcon
              data-slot="stat-card-chevron"
              className="dark:text-primary size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
              aria-hidden
            />
          ) : null}
        </span>
        {icon ? (
          <span
            className={cn(
              'flex shrink-0 items-center justify-center [&_svg]:size-[1.125rem]',
              emphasis
                ? 'text-primary-foreground/85'
                : interactive
                  ? 'text-primary'
                  : 'text-muted-foreground',
            )}
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
      </div>
      {/* Scales down in narrow cards so long amounts (large-number currencies) are not clipped. */}
      <div className="text-[clamp(1rem,10.5cqi,1.5rem)] leading-8 font-bold tracking-tight whitespace-nowrap tabular-nums">
        {value}
      </div>
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
          {deltaHint ? (
            <span className={interactive ? 'text-foreground/80' : 'text-muted-foreground'}>
              {deltaHint}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
