import type * as React from 'react';

import { cn } from '../../lib/cn.js';
import { toWesternDigits } from '../../lib/number.js';
import { fieldBase, fieldFocus, fieldInvalid } from '../../lib/styles.js';

export type InputProps = React.ComponentProps<'input'>;

const NUMERIC_MODES = new Set(['numeric', 'decimal', 'tel']);

/** Numeric fields only ever hold 0-9, even when the keyboard types Arabic-Indic digits. */
function isNumericField(type: string, inputMode: string | undefined): boolean {
  return type === 'tel' || type === 'number' || (inputMode !== undefined && NUMERIC_MODES.has(inputMode));
}

export function Input({ className, type = 'text', onChange, ...props }: InputProps) {
  const numeric = isNumericField(type, props.inputMode);
  const handleChange: React.ChangeEventHandler<HTMLInputElement> | undefined = numeric
    ? (event) => {
        const el = event.target;
        const fixed = toWesternDigits(el.value);
        if (fixed !== el.value) {
          const { selectionStart, selectionEnd } = el;
          el.value = fixed;
          if (selectionStart !== null && selectionEnd !== null) {
            el.setSelectionRange(selectionStart, selectionEnd);
          }
        }
        onChange?.(event);
      }
    : onChange;
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
      onChange={handleChange}
      {...props}
    />
  );
}
