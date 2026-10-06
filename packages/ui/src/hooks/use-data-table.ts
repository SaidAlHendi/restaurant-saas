import type { ReactNode } from 'react';

export interface DataTableColumn<TRow> {
  id: string;
  /** Header text (already translated). */
  header: ReactNode;
  /** Cell content for a row. */
  cell: (row: TRow) => ReactNode;
  /** Shows a sort button in the header. The server does the sorting. */
  sortable?: boolean;
  /** Can be hidden from the column menu (default true). */
  hideable?: boolean;
  align?: 'start' | 'center' | 'end';
  /** Extra classes for this column's header and cells (e.g. a width). */
  className?: string;
}

export interface DataTableSort {
  id: string;
  desc: boolean;
}

/** Hidden columns map: `{ notes: false }` hides the notes column. Missing ids are visible. */
export type DataTableVisibility = Record<string, boolean>;

export type AriaSort = 'ascending' | 'descending' | 'none';

/** Click cycle for a sortable header: none -> ascending -> descending -> none. */
export function nextSort(current: DataTableSort | null, columnId: string): DataTableSort | null {
  if (current?.id !== columnId) return { id: columnId, desc: false };
  if (!current.desc) return { id: columnId, desc: true };
  return null;
}

export interface UseDataTableOptions<TRow> {
  columns: DataTableColumn<TRow>[];
  sort?: DataTableSort | null;
  onSortChange?: (sort: DataTableSort | null) => void;
  columnVisibility?: DataTableVisibility;
}

/** Derived table state for DataTable: visible columns and sort handlers. No data fetching here. */
export function useDataTable<TRow>({
  columns,
  sort = null,
  onSortChange,
  columnVisibility = {},
}: UseDataTableOptions<TRow>) {
  const visibleColumns = columns.filter((column) => columnVisibility[column.id] !== false);

  const ariaSort = (column: DataTableColumn<TRow>): AriaSort | undefined => {
    if (!column.sortable) return undefined;
    if (sort?.id !== column.id) return 'none';
    return sort.desc ? 'descending' : 'ascending';
  };

  const toggleSort = (columnId: string) => {
    onSortChange?.(nextSort(sort, columnId));
  };

  return { visibleColumns, ariaSort, toggleSort };
}

/** For a column menu: every hideable column with its visibility, and a toggle. */
export function useColumnVisibility<TRow>(
  columns: DataTableColumn<TRow>[],
  visibility: DataTableVisibility,
  onVisibilityChange: (visibility: DataTableVisibility) => void,
) {
  return {
    items: columns
      .filter((column) => column.hideable !== false)
      .map((column) => ({
        id: column.id,
        header: column.header,
        visible: visibility[column.id] !== false,
      })),
    setVisible: (id: string, visible: boolean) => {
      onVisibilityChange({ ...visibility, [id]: visible });
    },
  };
}
