import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  convertMinorToDisplay,
  formatDisplayMinor,
  formatMoney,
  isDisplayConversionActive,
  type OrderDetail,
  type PaymentMethod,
} from '@app/shared';

import { randomUuid } from '../../../lib/uuid.js';
import { useCapturePaymentMutation } from '../../orders/orders.api.js';
import { parseOrdersApiErrorCode } from '../../orders/orders-api-errors.js';
import { showOrdersApiError } from '../../orders/show-orders-api-error.js';
import { cashChangeMinor, quickTenderAmounts } from '../pos-payment.utils.js';

export function usePosPaymentDialog(input: {
  branchId: string | null;
  order: OrderDetail | undefined;
  acceptsCard: boolean;
  onPaymentCaptured: () => void;
  onDismissUnpaid?: () => void;
  uiLocale: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [dialogOrder, setDialogOrder] = useState<OrderDetail | undefined>(undefined);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [tenderedMinor, setTenderedMinor] = useState<number | null>(null);
  const [clientPaymentId, setClientPaymentId] = useState<string | null>(null);
  const [capturePayment, captureState] = useCapturePaymentMutation();

  const activeOrder = dialogOrder ?? input.order;
  const dueMinor = activeOrder?.dueMinor ?? 0;

  // With a display currency the cashier counts that currency: the dialog works in it throughout.
  const cash = useMemo(() => cashCurrencyFor(activeOrder, input.uiLocale), [activeOrder, input.uiLocale]);
  const cashDueMinor = cash.toCash(dueMinor);

  const openForOrder = useCallback(
    (order?: OrderDetail) => {
      const target = order ?? input.order;
      if (!target) {
        return;
      }
      setDialogOrder(target);
      setMethod('cash');
      setTenderedMinor(
        target.dueMinor > 0 ? cashCurrencyFor(target, input.uiLocale).toCash(target.dueMinor) : null,
      );
      setClientPaymentId(randomUuid());
      setOpen(true);
    },
    [input.order, input.uiLocale],
  );

  const dismiss = useCallback(() => {
    const order = dialogOrder ?? input.order;
    if (order !== undefined && order.dueMinor > 0) {
      input.onDismissUnpaid?.();
    }
    setOpen(false);
    setDialogOrder(undefined);
    setClientPaymentId(null);
  }, [dialogOrder, input]);

  const quickAmounts = useMemo(() => quickTenderAmounts(cashDueMinor), [cashDueMinor]);

  const changeMinor = useMemo(() => {
    if (method !== 'cash' || tenderedMinor === null) {
      return null;
    }
    return cashChangeMinor(tenderedMinor, cashDueMinor);
  }, [cashDueMinor, method, tenderedMinor]);

  const canSubmit =
    input.branchId !== null &&
    activeOrder !== undefined &&
    dueMinor > 0 &&
    !captureState.isLoading &&
    (method === 'card' || (tenderedMinor !== null && tenderedMinor >= cashDueMinor));

  const submit = useCallback(async () => {
    if (!input.branchId || !activeOrder || !canSubmit || clientPaymentId === null) {
      return;
    }
    const body =
      method === 'cash'
        ? {
            clientPaymentId,
            expectedVersion: activeOrder.version,
            method: 'cash' as const,
            amountMinor: dueMinor,
            ...(cash.converted
              ? { displayTenderedMinor: tenderedMinor ?? cashDueMinor }
              : { tenderedMinor: tenderedMinor ?? dueMinor }),
          }
        : {
            clientPaymentId,
            expectedVersion: activeOrder.version,
            method: 'card' as const,
            amountMinor: dueMinor,
          };

    const result = await capturePayment({
      branchId: input.branchId,
      orderId: activeOrder.id,
      body,
      idempotencyKey: clientPaymentId,
    });

    if ('error' in result) {
      if (parseOrdersApiErrorCode(result.error) === 'ORDER_VERSION_CONFLICT') {
        input.onPaymentCaptured();
      }
      showOrdersApiError(result.error, t);
      return;
    }

    setOpen(false);
    setDialogOrder(undefined);
    setClientPaymentId(null);
    input.onPaymentCaptured();
  }, [
    activeOrder,
    canSubmit,
    capturePayment,
    cash.converted,
    cashDueMinor,
    dueMinor,
    input,
    method,
    t,
    tenderedMinor,
    clientPaymentId,
  ]);

  const showCard = input.acceptsCard;

  return {
    open,
    openForOrder,
    close: dismiss,
    showCard,
    method,
    setMethod,
    tenderedMinor,
    setTenderedMinor,
    quickAmounts,
    changeMinor,
    dueLabel: cash.format(cashDueMinor),
    changeLabel: changeMinor === null ? null : cash.format(changeMinor),
    canSubmit,
    submitting: captureState.isLoading,
    submit,
    /** Currency the cash fields are in (the display currency when the order has one). */
    currency: cash.currency,
    uiLocale: input.uiLocale,
    formatMinorLabel: cash.format,
    labels: {
      title: t('pos.payment.title'),
      due: t('pos.payment.due'),
      methodCash: t('pos.payment.methodCash'),
      methodCard: t('pos.payment.methodCard'),
      tendered: t('pos.payment.tendered'),
      change: t('pos.payment.change'),
      confirm: t('pos.payment.confirm'),
      cancel: t('pos.actions.cancel'),
    },
  };
}

type CashCurrency = {
  currency: string;
  converted: boolean;
  /** Order-currency minor units -> minor units of the currency the cashier counts. */
  toCash: (orderMinor: number) => number;
  format: (cashMinor: number) => string;
};

function cashCurrencyFor(order: OrderDetail | undefined, uiLocale: string): CashCurrency {
  const currency = order?.currency ?? 'USD';
  const display = order?.display;
  if (!isDisplayConversionActive(currency, display)) {
    return {
      currency,
      converted: false,
      toCash: (orderMinor) => orderMinor,
      format: (cashMinor) => formatMoney(cashMinor, currency, uiLocale),
    };
  }
  return {
    currency: display.currency,
    converted: true,
    toCash: (orderMinor) => convertMinorToDisplay(orderMinor, currency, display, 'total'),
    format: (cashMinor) => formatDisplayMinor(cashMinor, display, uiLocale, 'total'),
  };
}
