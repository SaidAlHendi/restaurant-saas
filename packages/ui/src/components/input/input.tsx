import type * as React from 'react';

import { cn } from '../../lib/cn.js';
import { fieldBase, fieldFocus, fieldInvalid } from '../../lib/styles.js';

export type InputProps = React.ComponentProps<'input'>;

export function Input({ className, type = 'text', ...props }: InputProps) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        'flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] md:text-sm',
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
        fieldBase,
        fieldFocus,
        fieldInvalid,
        className,
      )}
      {...props}
    />
  );
}
