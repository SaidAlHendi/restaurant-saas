import { CircleHelpIcon } from 'lucide-react';
import type * as React from 'react';

import { cn } from '../../lib/cn.js';
import { focusRing } from '../../lib/styles.js';
import { Popover, PopoverContent, PopoverTrigger } from '../popover/popover.js';

export interface HelpTipProps {
  /** Accessible name of the "?" button, e.g. "What does this mean?". */
  label: string;
  /** The explanation shown in the popover. */
  children: React.ReactNode;
  className?: string;
}

/** Small "?" button that opens a short explanation next to a form field or heading. */
export function HelpTip({ label, children, className }: HelpTipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          data-slot="help-tip"
          className={cn(
            'inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground',
            focusRing,
            className,
          )}
        >
          <CircleHelpIcon className="size-4" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="text-sm leading-relaxed">{children}</PopoverContent>
    </Popover>
  );
}
