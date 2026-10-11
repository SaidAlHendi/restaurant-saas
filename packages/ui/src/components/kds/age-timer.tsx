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
  normal: 'bg-muted text-foreground',
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
        'inline-flex min-w-16 items-center justify-center rounded-md px-2 py-1 text-base font-semibold tabular-nums',
        levelClass[level],
        className,
      )}
    >
      {label}
    </span>
  );
}
