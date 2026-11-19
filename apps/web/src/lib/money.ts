import {
  formatDisplayMinor,
  formatMoneyForDisplay,
  isDisplayConversionActive,
  type MoneyDisplay,
  type MoneyKind,
  type Payment,
} from '@app/shared';

export {
  currencyDigits,
  currencySymbol,
  formatMinor,
  formatMoney,
  intlLocaleForUi,
} from '@app/shared';

export function productDisplayCurrency(product: { currency?: string }, fallbackCurrency: string): string {
  return product.currency && product.currency.length > 0 ? product.currency : fallbackCurrency;
}

/**
 * Formats an amount stored in the base currency for people to read. `kind` picks the rounding
 * when a display currency is active: `item` for prices and lines, `total` for what gets paid.
 */
export type MoneyFormatter = (minor: number, kind?: MoneyKind) => string;

type MoneySource = { currency: string; display: MoneyDisplay | null };

export function moneyFormatter(
  currency: string,
  uiLocale: string,
  display: MoneyDisplay | null | undefined,
): MoneyFormatter {
  return (minor, kind = 'item') => formatMoneyForDisplay(minor, currency, uiLocale, display, kind);
}

/** Formatter for one order: uses the display currency frozen on that order, not today's. */
export function orderMoneyFormatter(order: MoneySource, uiLocale: string): MoneyFormatter {
  return moneyFormatter(order.currency, uiLocale, order.display);
}

export type CashLabels = { tendered: string | null; change: string | null };

/**
 * Cash handed over and change for a payment. With a display currency the cashier counted that
 * currency, so the exact amounts stored on the payment are shown rather than converted ones.
 */
export function paymentCashLabels(payment: Payment, order: MoneySource, uiLocale: string): CashLabels {
  if (payment.method !== 'cash') {
    return { tendered: null, change: null };
  }
  const { display } = order;
  if (isDisplayConversionActive(order.currency, display) && payment.displayTenderedMinor !== null) {
    const change = payment.displayChangeMinor ?? 0;
    return {
      tendered: formatDisplayMinor(payment.displayTenderedMinor, display, uiLocale, 'total'),
      change: change > 0 ? formatDisplayMinor(change, display, uiLocale, 'total') : null,
    };
  }
  const format = orderMoneyFormatter(order, uiLocale);
  return {
    tendered: payment.tenderedMinor !== null ? format(payment.tenderedMinor, 'total') : null,
    change:
      payment.changeMinor !== null && payment.changeMinor > 0
        ? format(payment.changeMinor, 'total')
        : null,
  };
}
