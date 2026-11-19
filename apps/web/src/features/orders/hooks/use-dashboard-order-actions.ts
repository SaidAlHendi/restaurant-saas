import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { useAppSelector } from '../../../app/hooks.js';
import { usePosOrderDetail } from '../../pos/hooks/use-pos-order-detail.js';
import { usePosPaymentDialog } from '../../pos/hooks/use-pos-payment-dialog.js';
import { useGetPosMenuQuery } from '../../pos/pos.api.js';
import { useListDiningTablesQuery } from '../../tables/tables.api.js';
import {
  dashboardActionLayout,
  hasAnyDashboardAction,
} from '../../pos/pos-order-detail.utils.js';
import {
  selectCan,
  selectCurrentBranchId,
  selectSessionOrg,
} from '../../session/session.selectors.js';

const noop = () => undefined;

/**
 * Actions on the dashboard order page. It reuses the POS order-detail hook (same rules, same
 * dialogs, same PIN approval) and only decides what to show for the signed-in user.
 * Add items stays on the POS, so it is not offered here.
 */
export function useDashboardOrderActions() {
  const { orderId = '' } = useParams();
  const { i18n } = useTranslation();
  const branchId = useAppSelector(selectCurrentBranchId);
  const org = useAppSelector(selectSessionOrg);
  const canCreate = useAppSelector(selectCan('orders.create'));
  const canUpdateStatus = useAppSelector(selectCan('orders.update_status'));
  const canCancel = useAppSelector(selectCan('orders.cancel'));
  const canReopen = useAppSelector(selectCan('orders.reopen'));
  const mayAct = canCreate || canUpdateStatus || canCancel || canReopen;

  const { data: menu } = useGetPosMenuQuery(branchId ?? '', { skip: !branchId || !canCreate });
  const { data: tablesData } = useListDiningTablesQuery(branchId ?? '', {
    skip: !branchId || !canCreate,
  });
  const tableLabelById = useMemo(
    () => new Map((tablesData?.items ?? []).map((table) => [table.id, table.label])),
    [tablesData?.items],
  );

  const contentLocale = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const pos = usePosOrderDetail({
    branchId: mayAct ? branchId : null,
    orderId: mayAct && orderId.length > 0 ? orderId : null,
    onClose: noop,
    menu,
    tableLabelById,
    locale: contentLocale,
    defaultLocale: org?.defaultLocale ?? 'en',
    uiLocale: i18n.language,
    additionLines: [],
    clearAdditionLines: noop,
    isAddingItems: false,
    onStartAddItems: noop,
    onExitAddItems: noop,
    printAdditions: false,
    payBeforeSend: false,
    onAdditionsHeld: noop,
    canCancelOrders: canCancel,
    canCreateOrders: canCreate,
    canReopenOrders: canReopen,
    // Unpaid ready order: take payment first; the user taps the hand-over button again afterwards.
    onHandoverNeedsPayment: () => {
      if (pos.order) {
        paymentDialog.openForOrder(pos.order);
      }
    },
  });

  const paymentDialog = usePosPaymentDialog({
    branchId,
    order: pos.order,
    acceptsCard: menu?.branch.acceptsCard ?? true,
    onPaymentCaptured: noop,
    uiLocale: i18n.language,
  });

  const layout = useMemo(
    () =>
      mayAct && pos.layout
        ? dashboardActionLayout(
            // Add items has no place here; the filter drops it whatever the POS rules say.
            pos.layout,
            { create: canCreate, updateStatus: canUpdateStatus },
          )
        : null,
    [canCreate, canUpdateStatus, mayAct, pos.layout],
  );

  return {
    pos,
    paymentDialog,
    layout,
    visible: layout !== null && hasAnyDashboardAction(layout),
    onPay: () => {
      if (pos.order) {
        paymentDialog.openForOrder(pos.order);
      }
    },
    /** Void buttons on item lines, only for users who may void. */
    voidAction: canCreate ? pos.voidAction : undefined,
    tableLabel: pos.tableLabel,
  };
}

export type DashboardOrderActionsViewModel = ReturnType<typeof useDashboardOrderActions>;
