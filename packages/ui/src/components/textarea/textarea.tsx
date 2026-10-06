import type * as React from 'react';

import { cn } from '../../lib/cn.js';
import { fieldBase, fieldFocus, fieldInvalid } from '../../lib/styles.js';

export type TextareaProps = React.ComponentProps<'textarea'>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-16 w-full rounded-md border px-3 py-2 text-base shadow-xs transition-[color,box-shadow] md:text-sm',
        fieldBase,
        fieldFocus,
        fieldInvalid,
        className,
      )}
      {...props}
    />
  );
}
