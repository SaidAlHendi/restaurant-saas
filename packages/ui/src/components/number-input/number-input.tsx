import type * as React from 'react';
import { MinusIcon, PlusIcon } from 'lucide-react';

import { useNumberInput, type UseNumberInputOptions } from '../../hooks/use-number-input.js';
import { cn } from '../../lib/cn.js';
import { fieldBase } from '../../lib/styles.js';
import { IconButton } from '../icon-button/icon-button.js';

export interface NumberInputProps
  extends UseNumberInputOptions,
    Omit<
      React.ComponentProps<'input'>,
      'value' | 'defaultValue' | 'onChange' | 'type' | 'size' | 'min' | 'max' | 'step'
    > {
  /** Accessible labels for the buttons (already translated). */
  decrementLabel: string;
  incrementLabel: string;
  size?: 'md' | 'touch';
}

/** Quantity field with − / + buttons. ArrowUp/ArrowDown step the value. */
export function NumberInput({
  value,
  onValueChange,
  min,
  max,
  step,
  allowDecimal,
  decrementLabel,
  incrementLabel,
  size = 'md',
  className,
  disabled,
  onBlur,
  onKeyDown,
  ...props
}: NumberInputProps) {
  const { inputProps, increment, decrement, canIncrement, canDecrement } = useNumberInput({
    value,
    onValueChange,
    min,
    max,
    step,
    allowDecimal,
  });
  const buttonSize = size === 'touch' ? 'touch' : 'md';
  return (
    <div
      data-slot="number-input"
      data-disabled={disabled}
      className={cn(
        'inline-flex w-fit items-center justify-self-start rounded-md border shadow-xs transition-[color,box-shadow]',
        size === 'touch' ? 'h-12' : 'h-9',
        'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/60',
        'has-aria-invalid:border-destructive has-aria-invalid:ring-2 has-aria-invalid:ring-destructive/30',
        'data-[disabled=true]:opacity-50',
        fieldBase,
        className,
      )}
    >
      <IconButton
        label={decrementLabel}
        icon={<MinusIcon />}
        size={buttonSize}
        variant="ghost"
        tabIndex={-1}
        disabled={disabled || !canDecrement}
        onClick={decrement}
        className="rounded-e-none"
      />
      <input
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        autoComplete="off"
        disabled={disabled}
        className={cn(
          'h-full min-w-0 bg-transparent text-center tabular-nums outline-none disabled:cursor-not-allowed',
          size === 'touch' ? 'w-16 text-lg' : 'w-12 text-sm',
        )}
        {...props}
        {...inputProps}
        onBlur={(event) => {
          inputProps.onBlur();
          onBlur?.(event);
        }}
        onKeyDown={(event) => {
          inputProps.onKeyDown(event);
          onKeyDown?.(event);
        }}
      />
      <IconButton
        label={incrementLabel}
        icon={<PlusIcon />}
        size={buttonSize}
        variant="ghost"
        tabIndex={-1}
        disabled={disabled || !canIncrement}
        onClick={increment}
        className="rounded-s-none"
      />
    </div>
  );
}
