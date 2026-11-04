import type * as React from 'react';

import { cn } from '../../lib/cn.js';
import { focusRing } from '../../lib/styles.js';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: React.ReactNode;
};

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** Accessible name of the group (already translated). */
  label: string;
  className?: string;
}

/** Two or three exclusive choices as one pill row (order type). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      data-slot="segmented-control"
      className={cn('grid gap-1 rounded-md bg-muted p-1', className)}
      style={{ gridTemplateColumns: `repeat(${String(options.length)}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => {
              onValueChange(option.value);
            }}
            className={cn(
              'flex h-11 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors [&_svg]:size-4',
              active
                ? 'bg-background text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
              focusRing,
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
