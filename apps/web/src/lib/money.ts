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
