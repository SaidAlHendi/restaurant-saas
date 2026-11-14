import { convertDisplayToBaseMinor, convertMinorToDisplay } from '@app/shared';
import type { CreatePaymentBody, MoneyDisplay } from '@app/shared';

import { BusinessRuleError, ValidationError } from '../../core/errors/app-errors';

export type CashAmounts = {
  tenderedMinor: number;
  changeMinor: number;
  displayTenderedMinor: number | null;
  displayChangeMinor: number | null;
};

/**
 * Cash handed over and change, in the order currency and (when the order has one) in its display
 * currency. With a display currency the cashier counts display-currency cash, so that side is
 * exact and the order-currency side is derived from it.
 */
export function resolveCashAmounts(
  body: Pick<CreatePaymentBody, 'amountMinor' | 'tenderedMinor' | 'displayTenderedMinor'>,
  orderCurrency: string,
  display: MoneyDisplay | null,
): CashAmounts {
  if (display === null || body.displayTenderedMinor === undefined) {
    if (body.tenderedMinor === undefined) {
      throw new ValidationError('tenderedMinor is required for cash');
    }
    if (body.tenderedMinor < body.amountMinor) {
      throw new BusinessRuleError(
        'PAYMENT_TENDERED_INSUFFICIENT',
        'Tendered amount is less than payment amount',
        { tenderedMinor: body.tenderedMinor, amountMinor: body.amountMinor },
      );
    }
    return {
      tenderedMinor: body.tenderedMinor,
      changeMinor: body.tenderedMinor - body.amountMinor,
      displayTenderedMinor: null,
      displayChangeMinor: null,
    };
  }

  const displayAmountMinor = convertMinorToDisplay(
    body.amountMinor,
    orderCurrency,
    display,
    'total',
  );
  if (body.displayTenderedMinor < displayAmountMinor) {
    throw new BusinessRuleError(
      'PAYMENT_TENDERED_INSUFFICIENT',
      'Tendered amount is less than payment amount',
      { displayTenderedMinor: body.displayTenderedMinor, displayAmountMinor },
    );
  }
  // Rounding the total down can leave the converted cash a hair under the amount: never below it.
  const tenderedMinor = Math.max(
    body.amountMinor,
    convertDisplayToBaseMinor(body.displayTenderedMinor, orderCurrency, display),
  );
  return {
    tenderedMinor,
    changeMinor: tenderedMinor - body.amountMinor,
    displayTenderedMinor: body.displayTenderedMinor,
    displayChangeMinor: body.displayTenderedMinor - displayAmountMinor,
  };
}
