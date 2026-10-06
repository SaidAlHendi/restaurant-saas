import { useState } from 'react';

import {
  ORDER_STATUSES,
  formatMinor,
  type DataTableSort,
  type DataTableVisibility,
  type OrderStatus,
} from '@app/ui';

import type { DevUiCopy } from './dev-ui.copy.js';

export interface DemoOrder {
  id: string;
  number: number;
  customer: string;
  type: string;
  status: OrderStatus;
  totalMinor: number;
  total: string;
}

export type TableState = 'data' | 'loading' | 'empty' | 'error';

const PAGE_SIZE = 8;
const ORDER_COUNT = 160;

function buildOrders(copy: DevUiCopy, locale: string): DemoOrder[] {
  const { customers, types } = copy.data;
  return Array.from({ length: ORDER_COUNT }, (_, i) => {
    const totalMinor = 750 + ((i * 1375) % 9000);
    return {
      id: `order-${String(i)}`,
      number: 1001 + i,
      customer: customers[i % customers.length] ?? '',
      type: types[i % types.length] ?? '',
      status: ORDER_STATUSES[i % ORDER_STATUSES.length] ?? 'new',
      totalMinor,
      total: formatMinor(totalMinor, 2, locale),
    };
  });
}

function compareOrders(a: DemoOrder, b: DemoOrder, sort: DataTableSort): number {
  const sign = sort.desc ? -1 : 1;
  switch (sort.id) {
    case 'total':
      return sign * (a.totalMinor - b.totalMinor);
    case 'customer':
      return sign * a.customer.localeCompare(b.customer);
    default:
      return sign * (a.number - b.number);
  }
}

/**
 * Demo data for the DataTable section. In a real feature, search/sort/page go to the API
 * through RTK Query; here the hook filters an in-memory list to show the same props.
 */
export function useOrdersDemo(copy: DevUiCopy, locale: string) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<DataTableSort | null>({ id: 'number', desc: true });
  const [columnVisibility, setColumnVisibility] = useState<DataTableVisibility>({});
  const [page, setPage] = useState(1);
  const [tableState, setTableState] = useState<TableState>('data');

  const all = buildOrders(copy, locale);
  const query = search.toLowerCase();
  const filtered = all.filter(
    (order) => String(order.number).includes(query) || order.customer.toLowerCase().includes(query),
  );
  const sorted = sort ? [...filtered].sort((a, b) => compareOrders(a, b, sort)) : filtered;
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return {
    rows: tableState === 'empty' ? [] : rows,
    isLoading: tableState === 'loading',
    hasError: tableState === 'error',
    tableState,
    onTableStateChange: (value: string) => {
      setTableState(value as TableState);
    },
    onSearchChange: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    sort,
    onSortChange: (next: DataTableSort | null) => {
      setSort(next);
      setPage(1);
    },
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    page: currentPage,
    pageCount,
    onPageChange: setPage,
    hasPrevious: currentPage > 1,
    hasNext: currentPage < pageCount,
    onPrevious: () => {
      setPage(currentPage - 1);
    },
    onNext: () => {
      setPage(currentPage + 1);
    },
    onRetry: () => {
      setTableState('data');
    },
    formatPage: (value: number) => new Intl.NumberFormat(locale).format(value),
  };
}

export type OrdersDemo = ReturnType<typeof useOrdersDemo>;
