import type { ReactNode } from 'react';
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, Columns3Icon } from 'lucide-react';

import {
  useColumnVisibility,
  useDataTable,
  type DataTableColumn,
  type DataTableSort,
  type DataTableVisibility,
} from '../../hooks/use-data-table.js';
import { cn } from '../../lib/cn.js';
import { Button } from '../button/button.js';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../dropdown-menu/dropdown-menu.js';
import { Skeleton } from '../skeleton/skeleton.js';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../table/table.js';

const alignClass = { start: 'text-start', center: 'text-center', end: 'text-end' } as const;

export interface DataTableProps<TRow> {
  columns: DataTableColumn<TRow>[];
  data: TRow[];
  getRowId: (row: TRow) => string;
  /** Shows skeleton rows instead of data. */
  isLoading?: boolean;
  /** When set, shown instead of rows (e.g. an Alert with a retry button). */
  error?: ReactNode;
  /** Shown when there are no rows (e.g. an EmptyState). */
  emptyState: ReactNode;
  sort?: DataTableSort | null;
  onSortChange?: (sort: DataTableSort | null) => void;
  columnVisibility?: DataTableVisibility;
  /** Buttons or a menu at the end of each row. */
  rowActions?: (row: TRow) => ReactNode;
  /** Keeps the header visible while the body scrolls; pair with a max height in containerClassName. */
  stickyHeader?: boolean;
  onRowClick?: (row: TRow) => void;
  labels: {
    /** Header for the row actions column (visually hidden). */
    actions: string;
    /** Prefix for the sort button's accessible name, e.g. "Sort by". */
    sortBy: string;
  };
  caption?: ReactNode;
  loadingRows?: number;
  className?: string;
  containerClassName?: string;
}

/** Presentational table. Sorting/paging state lives in the feature's view-model hook. */
export function DataTable<TRow>({
  columns,
  data,
  getRowId,
  isLoading = false,
  error,
  emptyState,
  sort,
  onSortChange,
  columnVisibility,
  rowActions,
  stickyHeader = false,
  onRowClick,
  labels,
  caption,
  loadingRows = 5,
  className,
  containerClassName,
}: DataTableProps<TRow>) {
  const { visibleColumns, ariaSort, toggleSort } = useDataTable({
    columns,
    sort,
    onSortChange,
    columnVisibility,
  });
  const colSpan = visibleColumns.length + (rowActions ? 1 : 0);

  return (
    <Table
      data-slot="data-table"
      aria-busy={isLoading || undefined}
      className={className}
      containerClassName={cn('rounded-md border', containerClassName)}
    >
      {caption ? <TableCaption>{caption}</TableCaption> : null}
      <TableHeader
        className={cn(
          stickyHeader && 'sticky top-0 z-10 bg-background shadow-[0_1px_0_var(--color-border)]',
        )}
      >
        <TableRow className="hover:bg-transparent">
          {visibleColumns.map((column) => (
            <TableHead
              key={column.id}
              aria-sort={ariaSort(column)}
              className={cn(alignClass[column.align ?? 'start'], column.className)}
            >
              {column.sortable ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="-mx-2 gap-1.5 px-2"
                  aria-label={`${labels.sortBy} ${typeof column.header === 'string' ? column.header : column.id}`}
                  onClick={() => {
                    toggleSort(column.id);
                  }}
                >
                  {column.header}
                  {sort?.id === column.id ? (
                    sort.desc ? (
                      <ArrowDownIcon aria-hidden />
                    ) : (
                      <ArrowUpIcon aria-hidden />
                    )
                  ) : (
                    <ArrowUpDownIcon className="opacity-40" aria-hidden />
                  )}
                </Button>
              ) : (
                column.header
              )}
            </TableHead>
          ))}
          {rowActions ? (
            <TableHead className="w-0 text-end">
              <span className="sr-only">{labels.actions}</span>
            </TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: loadingRows }, (_, i) => (
            <TableRow key={`loading-${String(i)}`} className="hover:bg-transparent">
              {visibleColumns.map((column) => (
                <TableCell key={column.id}>
                  <Skeleton className="h-4 w-full max-w-40" />
                </TableCell>
              ))}
              {rowActions ? (
                <TableCell>
                  <Skeleton className="ms-auto size-8" />
                </TableCell>
              ) : null}
            </TableRow>
          ))
        ) : error ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={colSpan} className="whitespace-normal p-4">
              {error}
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={colSpan} className="whitespace-normal p-0">
              {emptyState}
            </TableCell>
          </TableRow>
        ) : (
          data.map((row) => (
            <TableRow
              key={getRowId(row)}
              className={cn(onRowClick && 'cursor-pointer')}
              onClick={
                onRowClick
                  ? () => {
                      onRowClick(row);
                    }
                  : undefined
              }
            >
              {visibleColumns.map((column) => (
                <TableCell
                  key={column.id}
                  className={cn(alignClass[column.align ?? 'start'], column.className)}
                >
                  {column.cell(row)}
                </TableCell>
              ))}
              {rowActions ? (
                <TableCell
                  className="text-end"
                  // Clicking an action must not also trigger the row click.
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  {rowActions(row)}
                </TableCell>
              ) : null}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

export interface DataTableColumnToggleProps<TRow> {
  columns: DataTableColumn<TRow>[];
  columnVisibility: DataTableVisibility;
  onColumnVisibilityChange: (visibility: DataTableVisibility) => void;
  /** Button text and menu title (already translated). */
  label: string;
}

/** "Columns" menu to show/hide DataTable columns. */
export function DataTableColumnToggle<TRow>({
  columns,
  columnVisibility,
  onColumnVisibilityChange,
  label,
}: DataTableColumnToggleProps<TRow>) {
  const { items, setVisible } = useColumnVisibility(
    columns,
    columnVisibility,
    onColumnVisibilityChange,
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3Icon aria-hidden />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => (
          <DropdownMenuCheckboxItem
            key={item.id}
            checked={item.visible}
            onCheckedChange={(checked) => {
              setVisible(item.id, checked);
            }}
            onSelect={(event) => {
              // Keep the menu open so several columns can be toggled.
              event.preventDefault();
            }}
          >
            {item.header}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
