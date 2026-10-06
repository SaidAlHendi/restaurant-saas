import type * as React from 'react';
import { Loader2Icon } from 'lucide-react';

import { cn } from '../../lib/cn.js';

const sizes = { sm: 'size-4', md: 'size-6', lg: 'size-10' } as const;

export interface SpinnerProps extends React.ComponentProps<'span'> {
  size?: keyof typeof sizes;
  /** Read by screen readers (already translated), e.g. "Loading orders". */
  label: string;
}

export function Spinner({ size = 'md', label, className, ...props }: SpinnerProps) {
  return (
    <span
      data-slot="spinner"
      role="status"
      className={cn('inline-flex items-center justify-center text-muted-foreground', className)}
      {...props}
    >
      <Loader2Icon className={cn('animate-spin', sizes[size])} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
