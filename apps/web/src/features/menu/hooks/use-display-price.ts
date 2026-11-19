import { convertDisplayToBaseMinor, convertMinorToDisplay, type MoneyDisplay } from '@app/shared';
import { useState } from 'react';

/**
 * Keeps the display-currency price field in step with the system (base currency) price.
 * What was typed in the display field is kept as typed until the system price changes,
 * so rounding never rewrites the number under the cursor.
 */
export function useDisplayPrice(
  value: number | null,
  currency: string,
  display: MoneyDisplay,
  onChange: (value: number | null) => void,
) {
  const [typed, setTyped] = useState<{ base: number | null; shown: number | null } | null>(null);

  const shown =
    typed && typed.base === value
      ? typed.shown
      : value === null
        ? null
        : convertMinorToDisplay(value, currency, display, 'item');

  return {
    displayValue: shown,
    onSystemChange: (next: number | null) => {
      setTyped(null);
      onChange(next);
    },
    onDisplayChange: (next: number | null) => {
      const base = next === null ? null : convertDisplayToBaseMinor(next, currency, display);
      setTyped({ base, shown: next });
      onChange(base);
    },
  };
}
