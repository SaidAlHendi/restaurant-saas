import type * as React from 'react';

import { useMoneyInput, type UseMoneyInputOptions } from '../../hooks/use-money-input.js';
import { cn } from '../../lib/cn.js';
import { fieldBase, fieldInvalid } from '../../lib/styles.js';

export interface MoneyInputProps
  extends
    UseMoneyInputOptions,
    Omit<React.ComponentProps<'input'>, 'value' | 'defaultValue' | 'onChange' | 'type' | 'size'> {
  size?: 'md' | 'touch';
}

/** Amount field. Value in and out is integer minor units (e.g. 1250 = 12.50 SAR). */
export function MoneyInput({
  value,
  onValueChange,
  currency,
  locale,
  allowNegative,
  size = 'md',
  className,
  disabled,
  onFocus,
  onBlur,
  ...props
}: MoneyInputProps) {
  const { symbol, inputProps } = useMoneyInput({
    value,
    onValueChange,
    currency,
    locale,
    allowNegative,
  });
  return (
    <div
      data-slot="money-input"
      data-disabled={disabled}
      className={cn(
        'flex w-full items-center rounded-md border shadow-xs transition-[color,box-shadow]',
        'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/60',
        'has-aria-invalid:border-destructive has-aria-invalid:ring-2 has-aria-invalid:ring-destructive/30',
        'data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50',
        fieldBase,
        size === 'touch' ? 'h-12 text-lg' : 'h-9 text-base md:text-sm',
        className,
      )}
    >
      <span className="shrink-0 select-none ps-3 text-muted-foreground" aria-hidden>
        {symbol}
      </span>
      <input
        inputMode="decimal"
        autoComplete="off"
        // Amounts read left to right in every language; aligned to the end in RTL layouts.
        dir="ltr"
        disabled={disabled}
        className={cn(
          'h-full w-full min-w-0 bg-transparent px-3 tabular-nums outline-none rtl:text-end',
          'placeholder:text-muted-foreground disabled:cursor-not-allowed',
          fieldInvalid,
          'aria-invalid:ring-0',
        )}
        {...props}
        {...inputProps}
        onFocus={(event) => {
          inputProps.onFocus();
          onFocus?.(event);
        }}
        onBlur={(event) => {
          inputProps.onBlur();
          onBlur?.(event);
        }}
      />
      {symbol !== currency ? (
        // The ISO code next to a local symbol (ر.س. / SAR) avoids confusing similar symbols.
        <span className="shrink-0 select-none pe-3 text-xs text-muted-foreground" aria-hidden>
          {currency}
        </span>
      ) : null}
    </div>
  );
}
