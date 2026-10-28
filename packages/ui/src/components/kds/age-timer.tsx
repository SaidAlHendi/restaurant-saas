import { cn } from '../../lib/cn.js';

export type AgeLevel = 'normal' | 'amber' | 'red';

export type AgeTimerProps = {
  /** Already formatted, e.g. "12:05". The timer has no clock inside. */
  label: string;
  level: AgeLevel;
  ariaLabel?: string;
  className?: string;
};

const levelClass: Record<AgeLevel, string> = {
  normal: 'bg-muted text-muted-foreground',
  amber: 'bg-warning text-warning-foreground',
  red: 'bg-destructive text-destructive-foreground',
};

export function AgeTimer({ label, level, ariaLabel, className }: AgeTimerProps) {
  return (
    <span
      role="timer"
      aria-label={ariaLabel}
      data-level={level}
      className={cn(
        'inline-flex min-w-16 items-center justify-center rounded-full px-3 py-1 text-sm font-semibold tabular-nums',
        levelClass[level],
        className,
      )}
    >
      {label}
    </span>
  );
}
