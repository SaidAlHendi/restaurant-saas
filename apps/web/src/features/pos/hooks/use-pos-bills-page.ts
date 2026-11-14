import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { toast } from '@app/ui';
import {
  convertMinorToDisplay,
  formatDisplayMinor,
  formatMoney,
  isDisplayConversionActive,
  type Bill,
  type PaymentMethod,
} from '@app/shared';

import { baseApi } from '../../../app/api/base-api.js';
import { useAppDispatch, useAppSelector } from '../../../app/hooks.js';
import { intlLocaleForUi, moneyFormatter } from '../../../lib/money.js';
import { randomUuid } from '../../../lib/uuid.js';
import { useChangeOrderStatusMutation } from '../../orders/orders.api.js';
import { useBranchRealtime } from '../../realtime/use-branch-realtime.js';
import {
  selectCan,
  selectCurrentBranchId,
  selectSessionOrg,
} from '../../session/session.selectors.js';
import {
  useListBillsQuery,
  useCloseBillMutation,
  useMoveOrderTableMutation,
  usePayBillMutation,
} from '../../bills/bills.api.js';
import { useListDiningTablesQuery } from '../../tables/tables.api.js';
import {
  dueItems,
  itemDueMinor,
  movableOrders,
  seatSummaries,
  selectedDueMinor,
  statusesToComplete,
} from '../pos-bill.utils.js';
import { quickTenderAmounts } from '../pos-payment.utils.js';
import { useGetPosMenuQuery } from '../pos.api.js';

export function usePosBillsPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const uiLocale = intlLocaleForUi(i18n.language);
  const branchId = useAppSelector(selectCurrentBranchId);
  const org = useAppSelector(selectSessionOrg);
  const canPay = useAppSelector(selectCan('orders.create'));
  const defaultLocale = org?.defaultLocale ?? 'en';

  const { data: menu } = useGetPosMenuQuery(branchId ?? '', { skip: !branchId });
  const {
    data: bills,
    isLoading,
    isError,
    refetch,
  } = useListBillsQuery({ branchId: branchId ?? '' }, { skip: !branchId });
  const [payBill, payState] = usePayBillMutation();
  const [closeBill, closeState] = useCloseBillMutation();
  const [changeStatus] = useChangeOrderStatusMutation();
  const [moveOrder] = useMoveOrderTableMutation();
  const { data: tablesData } = useListDiningTablesQuery(branchId ?? '', { skip: !branchId });

  useBranchRealtime({
    branchId,
    onEvent: () => {
      dispatch(baseApi.util.invalidateTags([{ type: 'Bill', id: 'LIST' }]));
    },
    onResync: () => {
      dispatch(baseApi.util.invalidateTags(['Bill', 'Order']));
    },
  });

  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [tenderedMinor, setTenderedMinor] = useState<number | null>(null);
  const [clientPaymentId, setClientPaymentId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const [moveOrderIds, setMoveOrderIds] = useState<string[] | null>(null);
  const [moveTarget, setMoveTarget] = useState('');
  const [moving, setMoving] = useState(false);

  // Coming from a table card: open that bill straight away.
  const [searchParams, setSearchParams] = useSearchParams();
  const presetBillId = searchParams.get('bill');
  useEffect(() => {
    if (presetBillId === null) return;
    setSelectedBillId(presetBillId);
    setSelected(new Set());
    setSearchParams({}, { replace: true });
  }, [presetBillId, setSearchParams]);

  const bill: Bill | undefined = useMemo(
    () => bills?.find((b) => b.id === selectedBillId),
    [bills, selectedBillId],
  );

  const selectBill = useCallback((id: string | null) => {
    setSelectedBillId(id);
    setSelected(new Set());
  }, []);

  const toggleItem = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSeat = useCallback((itemIds: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = itemIds.every((id) => next.has(id));
      for (const id of itemIds) {
        if (allOn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!bill) return;
    setSelected(new Set(dueItems(bill).map((i) => i.id)));
  }, [bill]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const format = useMemo(
    () => moneyFormatter(bill?.currency ?? 'USD', uiLocale, bill?.display),
    [bill?.currency, bill?.display, uiLocale],
  );
  const formatTotal = useCallback((minor: number) => format(minor, 'total'), [format]);

  const payMinor = bill ? selectedDueMinor(bill, selected) : 0;

  // Like the order payment dialog: with a display currency the cashier counts that currency.
  const cash = useMemo(() => {
    const currency = bill?.currency ?? 'USD';
    const display = bill?.display ?? null;
    if (!isDisplayConversionActive(currency, display)) {
      return {
        currency,
        converted: false,
        toCash: (minor: number) => minor,
        format: (cashMinor: number) => formatMoney(cashMinor, currency, uiLocale),
      };
    }
    return {
      currency: display.currency,
      converted: true,
      toCash: (minor: number) => convertMinorToDisplay(minor, currency, display, 'total'),
      format: (cashMinor: number) => formatDisplayMinor(cashMinor, display, uiLocale, 'total'),
    };
  }, [bill?.currency, bill?.display, uiLocale]);

  const cashDueMinor = cash.toCash(payMinor);
  const changeMinor =
    method === 'cash' && tenderedMinor !== null && tenderedMinor > cashDueMinor
      ? tenderedMinor - cashDueMinor
      : 0;
  const canSubmitPayment =
    payMinor > 0 &&
    clientPaymentId !== null &&
    (method !== 'cash' || (tenderedMinor !== null && tenderedMinor >= cashDueMinor));

  const openPay = useCallback(() => {
    setMethod('cash');
    setTenderedMinor(cashDueMinor);
    setClientPaymentId(randomUuid());
    setPayOpen(true);
  }, [cashDueMinor]);

  const closePay = useCallback(() => {
    setPayOpen(false);
  }, []);

  const submitPayment = useCallback(async () => {
    if (!branchId || !bill || !canSubmitPayment) return;
    const result = await payBill({
      branchId,
      billId: bill.id,
      body: {
        clientPaymentId,
        method,
        itemIds: [...selected],
        ...(method === 'cash'
          ? cash.converted
            ? { displayTenderedMinor: tenderedMinor ?? 0 }
            : { tenderedMinor: tenderedMinor ?? 0 }
          : {}),
      },
    });
    if ('error' in result) {
      toast.error(t('pos.bills.payError'));
      void refetch();
      return;
    }
    setPayOpen(false);
    setSelected(new Set());
    toast.success(t('pos.bills.paid'));
  }, [
    branchId,
    bill,
    canSubmitPayment,
    cash.converted,
    clientPaymentId,
    method,
    payBill,
    refetch,
    selected,
    t,
    tenderedMinor,
  ]);

  const canClose =
    bill !== undefined && bill.dueMinor === 0 && bill.orders.every((o) => o.status !== 'draft');

  /** Serves any order still in the kitchen flow, then closes the bill. */
  const closeTable = useCallback(async () => {
    if (!branchId || !bill) return;
    setClosing(true);
    try {
      for (const order of bill.orders) {
        let version = order.version;
        for (const to of statusesToComplete(order.status)) {
          const res = await changeStatus({
            branchId,
            orderId: order.id,
            body: { to, expectedVersion: version },
          });
          if ('error' in res) throw new Error('status');
          version = res.data.version;
        }
      }
      const closed = await closeBill({ branchId, billId: bill.id });
      if ('error' in closed) throw new Error('close');
      toast.success(t('pos.bills.closed'));
      selectBill(null);
    } catch {
      toast.error(t('pos.bills.closeError'));
      void refetch();
    } finally {
      setClosing(false);
    }
  }, [bill, branchId, changeStatus, closeBill, refetch, selectBill, t]);

  const movable = useMemo(() => (bill ? movableOrders(bill) : []), [bill]);
  const moveTargets = useMemo(
    () =>
      (tablesData?.items ?? [])
        .filter((table) => table.isActive && table.id !== bill?.tableId)
        .map((table) => ({ id: table.id, label: table.label })),
    [tablesData?.items, bill?.tableId],
  );

  const openMove = useCallback((orderIds: string[]) => {
    setMoveOrderIds(orderIds);
    setMoveTarget('');
  }, []);

  /** Moves the chosen orders; the first one picks the target's bill and the rest follow onto it. */
  const confirmMove = useCallback(async () => {
    if (!branchId || !bill || moveOrderIds === null || moveTarget === '') return;
    setMoving(true);
    try {
      let targetBillId: string | undefined;
      for (const orderId of moveOrderIds) {
        const order = bill.orders.find((o) => o.id === orderId);
        if (!order) continue;
        const res = await moveOrder({
          branchId,
          orderId,
          body: {
            expectedVersion: order.version,
            tableId: moveTarget,
            newBill: false,
            ...(targetBillId !== undefined ? { billId: targetBillId } : {}),
          },
        });
        if ('error' in res) {
          const data = (res.error as { data?: { code?: string } }).data;
          throw new Error(data?.code ?? 'move');
        }
        targetBillId = res.data.billId;
      }
      toast.success(t('pos.bills.moved'));
      setMoveOrderIds(null);
      selectBill(null);
    } catch (error) {
      toast.error(
        error instanceof Error && error.message === 'BILL_AMBIGUOUS'
          ? t('pos.bills.moveAmbiguous')
          : t('pos.bills.moveError'),
      );
      void refetch();
    } finally {
      setMoving(false);
    }
  }, [bill, branchId, moveOrderIds, moveOrder, moveTarget, refetch, selectBill, t]);

  return {
    t,
    uiLocale,
    defaultLocale,
    canPay,
    isLoading,
    isError,
    retry: () => void refetch(),
    bills: bills ?? [],
    bill,
    selectBill,
    selected,
    toggleItem,
    toggleSeat,
    selectAll,
    clearSelection,
    seats: bill ? seatSummaries(bill) : [],
    itemDue: itemDueMinor,
    format,
    formatTotal,
    payMinor,
    payOpen,
    openPay,
    closePay,
    method,
    setMethod,
    showCard: menu?.branch.acceptsCard ?? false,
    tenderedMinor,
    setTenderedMinor,
    cashCurrency: cash.currency,
    formatCash: cash.format,
    cashDueMinor,
    quickAmounts: quickTenderAmounts(cashDueMinor),
    changeMinor,
    canSubmitPayment,
    submitting: payState.isLoading,
    submitPayment: () => void submitPayment(),
    canClose,
    closing: closing || closeState.isLoading,
    closeTable: () => void closeTable(),
    movableIds: movable.map((o) => o.id),
    moveOpen: moveOrderIds !== null,
    moveCount: moveOrderIds?.length ?? 0,
    openMove,
    closeMove: () => {
      setMoveOrderIds(null);
    },
    moveTargets,
    moveTarget,
    setMoveTarget,
    moving,
    confirmMove: () => void confirmMove(),
  };
}
