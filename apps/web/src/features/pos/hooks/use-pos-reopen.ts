import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { toast } from '@app/ui';

import { useChangeOrderStatusMutation } from '../../orders/orders.api.js';
import { showOrdersApiError } from '../../orders/show-orders-api-error.js';
import { REOPEN_REASON_MAX, reopenReasonValue } from '../pos-order-detail.utils.js';

/** Manager/owner: completed -> ready with an optional reason, after a confirm dialog. */
export function usePosReopen(input: {
  branchId: string | null;
  order: { id: string; version: number; orderNumber: number } | undefined;
  onReopened: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [changeStatus, state] = useChangeOrderStatusMutation();

  const close = useCallback(() => {
    setOpen(false);
    setReason('');
  }, []);

  const confirm = useCallback(async () => {
    const { order, branchId } = input;
    if (!branchId || !order) {
      return;
    }
    const value = reopenReasonValue(reason);
    const result = await changeStatus({
      branchId,
      orderId: order.id,
      body: {
        to: 'ready',
        expectedVersion: order.version,
        reopen: true,
        ...(value !== undefined ? { reason: value } : {}),
      },
    });
    if ('error' in result) {
      showOrdersApiError(result.error, t);
      return;
    }
    toast(t('pos.reopen.done', { number: order.orderNumber }));
    close();
    input.onReopened();
  }, [changeStatus, close, input, reason, t]);

  return {
    open,
    openDialog: () => {
      setOpen(true);
    },
    close,
    reason,
    onReasonChange: setReason,
    confirm,
    submitting: state.isLoading,
    reasonMax: REOPEN_REASON_MAX,
    labels: {
      action: t('pos.reopen.action'),
      title: t('pos.reopen.title'),
      body: t('pos.reopen.body'),
      reason: t('pos.reopen.reason'),
      confirm: t('pos.reopen.confirm'),
      cancel: t('pos.actions.cancel'),
    },
  };
}

export type PosReopenViewModel = ReturnType<typeof usePosReopen>;
