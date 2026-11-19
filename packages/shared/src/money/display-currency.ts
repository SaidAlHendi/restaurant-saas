import { z } from 'zod';

import { currencyDigits, currencySymbol } from './currency.js';
import { formatMoney, intlLocaleForUi } from './format-money.js';

/** Rounding steps an owner can pick, in whole display-currency units. 0 = no rounding. */
export const DISPLAY_ROUNDING_STEPS = [0, 1, 5, 10, 50, 100, 500, 1000, 5000] as const;

export const DEFAULT_DISPLAY_ITEM_STEP = 100;
export const DEFAULT_DISPLAY_TOTAL_STEP = 500;

/** Currencies whose everyday prices run into the thousands, so rounding to notes makes sense. */
const LARGE_NUMBER_CURRENCIES: ReadonlySet<string> = new Set([
  'SYP',
  'LBP',
  'IQD',
  'IRR',
  'YER',
  'SDG',
  'IDR',
  'VND',
]);

/** Rounding steps to start from when an owner picks `currency` as the display currency. */
export function defaultDisplaySteps(currency: string): { itemStep: number; totalStep: number } {
  return LARGE_NUMBER_CURRENCIES.has(currency)
    ? { itemStep: DEFAULT_DISPLAY_ITEM_STEP, totalStep: DEFAULT_DISPLAY_TOTAL_STEP }
    : { itemStep: 0, totalStep: 0 };
}

/** The exchange rate keeps 6 decimals (matches `numeric(18,6)` in the database). */
const RATE_SCALE = 1_000_000;

export const exchangeRateSchema = z
  .number()
  .positive()
  .max(1_000_000_000)
  .refine((rate) => Math.round(rate * RATE_SCALE) >= 1, 'Exchange rate is too small');

export const displayRoundingStepSchema = z
  .number()
  .int()
  .refine((step) => (DISPLAY_ROUNDING_STEPS as readonly number[]).includes(step), 'Unknown rounding step');

/**
 * How amounts stored in the base currency are shown to people.
 * `rate` = display-currency units for 1 base-currency unit (e.g. 13000 SYP for 1 USD).
 * Steps are whole display-currency units: prices round to `itemStep`, totals to `totalStep`.
 */
export const moneyDisplaySchema = z.object({
  currency: z.string().length(3),
  rate: exchangeRateSchema,
  itemStep: displayRoundingStepSchema,
  totalStep: displayRoundingStepSchema,
});

export type MoneyDisplay = z.infer<typeof moneyDisplaySchema>;

/** `item` = a price, line, subtotal or tax. `total` = what the customer pays (total, due, tendered, change). */
export type MoneyKind = 'item' | 'total';

function pow10(digits: number): bigint {
  return 10n ** BigInt(digits);
}

function divideRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (numerator * 2n + denominator) / (denominator * 2n);
}

function stepFor(display: MoneyDisplay, kind: MoneyKind): number {
  return kind === 'total' ? display.totalStep : display.itemStep;
}

/** True when amounts in `baseCurrency` must be converted before they are shown. */
export function isDisplayConversionActive(
  baseCurrency: string,
  display: MoneyDisplay | null | undefined,
): display is MoneyDisplay {
  return display !== null && display !== undefined && display.currency !== baseCurrency;
}

/**
 * Base-currency minor units -> display-currency minor units, rounded once (half up) to the step
 * for `kind`. Integer math only. The SQL in the reporting repository must round the same way.
 */
export function convertMinorToDisplay(
  baseMinor: number,
  baseCurrency: string,
  display: MoneyDisplay,
  kind: MoneyKind,
): number {
  const displayDigits = currencyDigits(display.currency);
  const step = stepFor(display, kind);
  const unit = step > 0 ? BigInt(step) * pow10(displayDigits) : 1n;
  const rateScaled = BigInt(Math.round(display.rate * RATE_SCALE));
  const numerator = BigInt(Math.abs(baseMinor)) * rateScaled * pow10(displayDigits);
  const denominator = pow10(currencyDigits(baseCurrency)) * BigInt(RATE_SCALE) * unit;
  const converted = Number(divideRoundHalfUp(numerator, denominator) * unit);
  return baseMinor < 0 ? -converted : converted;
}

/** Display-currency minor units -> base-currency minor units (nearest minor unit). */
export function convertDisplayToBaseMinor(
  displayMinor: number,
  baseCurrency: string,
  display: MoneyDisplay,
): number {
  const rateScaled = BigInt(Math.round(display.rate * RATE_SCALE));
  const numerator =
    BigInt(Math.abs(displayMinor)) * pow10(currencyDigits(baseCurrency)) * BigInt(RATE_SCALE);
  const denominator = rateScaled * pow10(currencyDigits(display.currency));
  const converted = Number(divideRoundHalfUp(numerator, denominator));
  return displayMinor < 0 ? -converted : converted;
}

/** Fraction digits to show: none when the step rounds to whole units anyway. */
export function displayFractionDigits(display: MoneyDisplay, kind: MoneyKind): number {
  return stepFor(display, kind) > 0 ? 0 : currencyDigits(display.currency);
}

/** Format an amount that is already in display-currency minor units. */
export function formatDisplayMinor(
  displayMinor: number,
  display: MoneyDisplay,
  uiLocale: string,
  kind: MoneyKind = 'total',
): string {
  const intlLocale = intlLocaleForUi(uiLocale);
  const currencyUnitDigits = currencyDigits(display.currency);
  const shownDigits = displayFractionDigits(display, kind);
  const amount = new Intl.NumberFormat(intlLocale, {
    minimumFractionDigits: shownDigits,
    maximumFractionDigits: shownDigits,
  }).format(displayMinor / 10 ** currencyUnitDigits);
  const symbol = currencySymbol(display.currency, intlLocale);
  if (symbol && symbol !== display.currency) {
    return `${symbol} ${amount}`;
  }
  return `${amount} ${display.currency}`;
}

/**
 * The one formatter screens should use for amounts stored in the base currency: converts and
 * rounds when a display currency is active, otherwise formats the base amount unchanged.
 */
export function formatMoneyForDisplay(
  baseMinor: number,
  baseCurrency: string,
  uiLocale: string,
  display: MoneyDisplay | null | undefined,
  kind: MoneyKind = 'item',
): string {
  if (!isDisplayConversionActive(baseCurrency, display)) {
    return formatMoney(baseMinor, baseCurrency, uiLocale);
  }
  return formatDisplayMinor(
    convertMinorToDisplay(baseMinor, baseCurrency, display, kind),
    display,
    uiLocale,
    kind,
  );
}
