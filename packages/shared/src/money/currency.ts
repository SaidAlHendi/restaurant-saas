/** Number of minor-unit digits for a currency: 2 for SAR/USD, 3 for KWD/BHD/JOD/OMR, 0 for JPY. */
export function currencyDigits(currency: string): number {
  try {
    return (
      new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

/**
 * Symbols Intl gets wrong for our users: SYP comes back as a bare "£", which reads as British pounds.
 * `null` means "show the currency code".
 */
const SYMBOL_OVERRIDES: Record<string, { ar: string | null; other: string | null }> = {
  SYP: { ar: 'ل.س', other: null },
};

/** Short currency symbol for a locale, e.g. "SAR" -> "ر.س.‏" in ar-SA, "$" for USD in en. */
export function currencySymbol(currency: string, locale: string): string {
  const override = SYMBOL_OVERRIDES[currency];
  if (override) {
    return (locale.startsWith('ar') ? override.ar : override.other) ?? currency;
  }
  try {
    const part = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    })
      .formatToParts(0)
      .find((p) => p.type === 'currency');
    return part?.value ?? currency;
  } catch {
    return currency;
  }
}

/** Minor units formatted for display in a locale (grouping, local digits), without symbol. */
export function formatMinor(minor: number, digits: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(minor / 10 ** digits);
}
