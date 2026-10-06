import { useState, type ChangeEvent, type KeyboardEvent } from 'react';

import { clamp, parseNumber } from '../lib/number.js';

export interface UseNumberInputOptions {
  value: number | null;
  onValueChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  allowDecimal?: boolean;
}

/** Stepper logic for NumberInput: typing (any digits), +/- buttons, ArrowUp/Down, clamping on blur. */
export function useNumberInput({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  allowDecimal = false,
}: UseNumberInputOptions) {
  const [draft, setDraft] = useState<string | null>(null);
  const allowNegative = min === undefined || min < 0;
  const text = draft ?? (value === null ? '' : String(value));

  const commit = (next: number) => {
    const clamped = clamp(next, min, max);
    if (clamped !== value) onValueChange(clamped);
  };

  const stepBy = (direction: 1 | -1) => {
    const base = value ?? min ?? 0;
    // Round to the step's precision so 0.1 + 0.2 does not show 0.30000000000000004.
    const precision = (String(step).split('.')[1] ?? '').length;
    commit(Number((base + direction * step).toFixed(precision)));
    setDraft(null);
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    const parsed = parseNumber(next, { allowDecimal, allowNegative });
    if (parsed === undefined && next !== '-') return;
    setDraft(next);
    if (parsed === null) onValueChange(null);
    else if (parsed !== undefined) onValueChange(parsed);
  };

  const onBlur = () => {
    setDraft(null);
    if (value !== null) commit(value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      stepBy(1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      stepBy(-1);
    }
  };

  return {
    canDecrement: min === undefined || value === null || value > min,
    canIncrement: max === undefined || value === null || value < max,
    decrement: () => {
      stepBy(-1);
    },
    increment: () => {
      stepBy(1);
    },
    inputProps: {
      value: text,
      onChange,
      onBlur,
      onKeyDown,
      role: 'spinbutton' as const,
      'aria-valuenow': value ?? undefined,
      'aria-valuemin': min,
      'aria-valuemax': max,
    },
  };
}
