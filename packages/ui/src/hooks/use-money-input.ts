import { useState, type ChangeEvent } from 'react';

import {
  currencyDigits,
  currencySymbol,
  formatMinor,
  minorToText,
  parseMinor,
} from '../lib/number.js';

export interface UseMoneyInputOptions {
  /** Amount in minor units (halalas, fils, cents); null when empty. */
  value: number | null;
  onValueChange: (value: number | null) => void;
  /** ISO 4217 code, e.g. "SAR", "KWD". Decides the number of decimals. */
  currency: string;
  /** Locale for the symbol and the formatted value shown when not editing. */
  locale: string;
  allowNegative?: boolean;
}

/**
 * Text handling for MoneyInput: shows a formatted amount when idle, plain text while editing,
 * accepts Arabic digits, and only reports valid amounts (in minor units) to the caller.
 */
export function useMoneyInput({
  value,
  onValueChange,
  currency,
  locale,
  allowNegative = false,
}: UseMoneyInputOptions) {
  const digits = currencyDigits(currency);
  const [draft, setDraft] = useState<string | null>(null);

  const isEditing = draft !== null;
  const text = isEditing ? draft : value === null ? '' : formatMinor(value, digits, locale);

  const onFocus = () => {
    setDraft(value === null ? '' : minorToText(value, digits));
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    const parsed = parseMinor(next, digits, { allowNegative });
    // Ignore keystrokes that can never become valid (letters, a 4th decimal in SAR).
    if (parsed === undefined && next !== '-') return;
    setDraft(next);
    if (parsed !== undefined && parsed !== value) onValueChange(parsed);
  };

  const onBlur = () => {
    setDraft(null);
  };

  return {
    text,
    symbol: currencySymbol(currency, locale),
    digits,
    inputProps: { value: text, onFocus, onChange, onBlur },
  };
}
