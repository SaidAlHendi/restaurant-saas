import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { OrderDetail, PaymentMethod } from '@app/shared';

import { randomUuid } from '../../../lib/uuid.js';
import { useCapturePaymentMutation } from '../../orders/orders.api.js';
import { parseOrdersApiErrorCode } from '../../orders/orders-api-errors.js';
import { showOrdersApiError } from '../../orders/show-orders-api-error.js';
import { cashChangeMinor, quickTenderAmounts } from '../pos-payment.utils.js';

export function usePosPaymentDialog(input: {
  branchId: string | null;
  order: OrderDetail | undefined;
  onPaymentCaptured: () => void;
  formatMinor: (minor: number) => string;
  currency: string;
  uiLocale: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [tenderedMinor, setTenderedMinor] = useState<number | null>(null);
  const [clientPaymentId, setClientPaymentId] = useState<string | null>(null);
  const [capturePayment, captureState] = useCapturePaymentMutation();

  const dueMinor = input.order?.dueMinor ?? 0;

  const openForOrder = useCallback(() => {
    setMethod('cash');
    setTenderedMinor(dueMinor > 0 ? dueMinor : null);
    setClientPaymentId(randomUuid());
    setOpen(true);
  }, [dueMinor]);

  const close = useCallback(() => {
    setOpen(false);
    setClientPaymentId(null);
  }, []);

  const quickAmounts = useMemo(() => quickTenderAmounts(dueMinor), [dueMinor]);

  const changeMinor = useMemo(() => {
    if (method !== 'cash' || tenderedMinor === null) {
      return null;
    }
    return cashChangeMinor(tenderedMinor, dueMinor);
  }, [dueMinor, method, tenderedMinor]);

  const canSubmit =
    input.branchId !== null &&
    input.order !== undefined &&
    dueMinor > 0 &&
    !captureState.isLoading &&
    (method === 'card' || (tenderedMinor !== null && tenderedMinor >= dueMinor));

  const submit = useCallback(async () => {
    if (!input.branchId || !input.order || !canSubmit || clientPaymentId === null) {
      return;
    }
    const body =
      method === 'cash'
        ? {
            clientPaymentId,
            expectedVersion: input.order.version,
            method: 'cash' as const,
            amountMinor: dueMinor,
            tenderedMinor: tenderedMinor ?? dueMinor,
          }
        : {
            clientPaymentId,
            expectedVersion: input.order.version,
            method: 'card' as const,
            amountMinor: dueMinor,
          };

    const result = await capturePayment({
      branchId: input.branchId,
      orderId: input.order.id,
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
    input.onPaymentCaptured();
  }, [
    canSubmit,
    capturePayment,
    dueMinor,
    input,
    method,
    t,
    tenderedMinor,
    clientPaymentId,
  ]);

  return {
    open,
    openForOrder,
    close,
    method,
    setMethod,
    tenderedMinor,
    setTenderedMinor,
    quickAmounts,
    changeMinor,
    dueLabel: formatMinorLabel(input.formatMinor, dueMinor),
    changeLabel: changeMinor === null ? null : input.formatMinor(changeMinor),
    canSubmit,
    submitting: captureState.isLoading,
    submit,
    currency: input.currency,
    uiLocale: input.uiLocale,
    formatMinorLabel: input.formatMinor,
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

function formatMinorLabel(formatMinor: (minor: number) => string, minor: number): string {
  return formatMinor(minor);
}
