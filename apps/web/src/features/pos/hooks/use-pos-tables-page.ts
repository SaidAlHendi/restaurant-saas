import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { baseApi } from '../../../app/api/base-api.js';
import { useAppDispatch, useAppSelector } from '../../../app/hooks.js';
import { intlLocaleForUi, moneyFormatter } from '../../../lib/money.js';
import { useListBillsQuery } from '../../bills/bills.api.js';
import { useBranchRealtime } from '../../realtime/use-branch-realtime.js';
import { selectCan, selectCurrentBranchId } from '../../session/session.selectors.js';
import { useListDiningTablesQuery } from '../../tables/tables.api.js';
import { tableCardInfo } from '../pos-bill.utils.js';

/** Tables as cards: pick one to take an order (a new one or another round) or to open its bill. */
export function usePosTablesPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const uiLocale = intlLocaleForUi(i18n.language);
  const branchId = useAppSelector(selectCurrentBranchId);
  const canOrder = useAppSelector(selectCan('orders.create'));

  const {
    data: tablesData,
    isLoading: tablesLoading,
    isError: tablesError,
    refetch: refetchTables,
  } = useListDiningTablesQuery(branchId ?? '', { skip: !branchId });
  const {
    data: bills,
    isLoading: billsLoading,
    isError: billsError,
    refetch: refetchBills,
  } = useListBillsQuery({ branchId: branchId ?? '' }, { skip: !branchId });

  useBranchRealtime({
    branchId,
    onEvent: () => {
      dispatch(baseApi.util.invalidateTags([{ type: 'Bill', id: 'LIST' }]));
    },
    onResync: () => {
      dispatch(baseApi.util.invalidateTags(['Bill', 'Order']));
    },
  });

  const cards = useMemo(() => {
    const openBills = bills ?? [];
    return (tablesData?.items ?? [])
      .filter((table) => table.isActive)
      .map((table) => {
        const info = tableCardInfo(openBills, table.id);
        const first = info.bills[0];
        const settled = info.bills.length > 0 && info.dueMinor === 0;
        return {
          id: table.id,
          label: table.label,
          busy: info.bills.length > 0,
          settled,
          rounds: info.rounds,
          pagers: info.pagers,
          dueLabel: first
            ? moneyFormatter(first.currency, uiLocale, first.display)(info.dueMinor, 'total')
            : null,
          billCount: info.bills.length,
          firstBillId: first?.id ?? null,
        };
      });
  }, [bills, tablesData?.items, uiLocale]);

  const openOrderScreen = useCallback(
    (tableId: string) => {
      void navigate(`/pos?table=${tableId}`);
    },
    [navigate],
  );
  const openBill = useCallback(
    (billId: string) => {
      void navigate(`/pos/bills?bill=${billId}`);
    },
    [navigate],
  );

  return {
    t,
    canOrder,
    isLoading: tablesLoading || billsLoading,
    isError: tablesError || billsError,
    retry: () => {
      void refetchTables();
      void refetchBills();
    },
    cards,
    openOrderScreen,
    openBill,
  };
}
