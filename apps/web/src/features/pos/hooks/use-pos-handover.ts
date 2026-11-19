import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { toast } from '@app/ui';

import { useChangeOrderStatusMutation } from '../../orders/orders.api.js';
import { showOrdersApiError } from '../../orders/show-orders-api-error.js';

/** How long the cashier can take back a handover; the server allows a little longer. */
export const HANDOVER_UNDO_MS = 10_000;

/** Ready -> completed ("Picked up" / "Served") with a 10-second Undo toast (completed -> ready). */
export function usePosHandover(branchId: string | null) {
  const { t } = useTranslation();
  const [changeStatus, state] = useChangeOrderStatusMutation();

  const complete = useCallback(
    async (order: { id: string; version: number; orderNumber: number }): Promise<boolean> => {
      if (!branchId) {
        return false;
      }
      const result = await changeStatus({
        branchId,
        orderId: order.id,
        body: { to: 'completed', expectedVersion: order.version },
      });
      if ('error' in result) {
        showOrdersApiError(result.error, t);
        return false;
      }
      const completed = result.data;
      toast(t('pos.handover.done', { number: order.orderNumber }), {
        duration: HANDOVER_UNDO_MS,
        action: {
          label: t('pos.handover.undo'),
          onClick: () => {
            void changeStatus({
              branchId,
              orderId: order.id,
              body: { to: 'ready', expectedVersion: completed.version, undo: true },
            }).then((undone) => {
              if ('error' in undone) {
                showOrdersApiError(undone.error, t);
              }
            });
          },
        },
      });
      return true;
    },
    [branchId, changeStatus, t],
  );

  return { complete, isLoading: state.isLoading };
}
