import { currencyDigits, currencySymbol, formatMinor } from '@app/ui';

/** Map app UI language (e.g. from i18n) to an Intl locale for number formatting. */
export function intlLocaleForUi(uiLocale: string): string {
  const base = uiLocale.split('-')[0] ?? uiLocale;
  if (base === 'ar') {
    return 'ar-SA';
  }
  if (uiLocale.includes('-')) {
    return uiLocale;
  }
  return `${base}-US`;
}

/** Format minor units with currency code/symbol for display in the dashboard. */
export function formatMoney(minor: number, currency: string, uiLocale: string): string {
  const intlLocale = intlLocaleForUi(uiLocale);
  const digits = currencyDigits(currency);
  const amount = formatMinor(minor, digits, intlLocale);
  const symbol = currencySymbol(currency, intlLocale);
  if (symbol && symbol !== currency) {
    return `${symbol} ${amount}`;
  }
  return `${amount} ${currency}`;
}

export function productDisplayCurrency(product: { currency?: string }, fallbackCurrency: string): string {
  return product.currency && product.currency.length > 0 ? product.currency : fallbackCurrency;
}
