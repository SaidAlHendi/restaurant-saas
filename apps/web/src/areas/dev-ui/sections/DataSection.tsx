import { EyeIcon, MoreHorizontalIcon, XCircleIcon } from 'lucide-react';

import {
  Badge,
  Button,
  CursorPagination,
  DataTable,
  DataTableColumnToggle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  NumberedPagination,
  OrderStatusBadge,
  RadioGroup,
  RadioGroupItem,
  Label,
  SearchInput,
  type DataTableColumn,
} from '@app/ui';

import type { DevUiCopy } from '../dev-ui.copy.js';
import type { DemoOrder, OrdersDemo } from '../orders-demo.js';
import { ShowcaseRow, ShowcaseSection } from './ShowcaseSection.js';

export interface DataSectionProps {
  copy: DevUiCopy;
  idPrefix: string;
  orders: OrdersDemo;
}

function orderColumns(copy: DevUiCopy): DataTableColumn<DemoOrder>[] {
  const d = copy.data;
  return [
    {
      id: 'number',
      header: d.order,
      cell: (o) => `#${String(o.number)}`,
      sortable: true,
      hideable: false,
    },
    { id: 'customer', header: d.customer, cell: (o) => o.customer, sortable: true },
    { id: 'type', header: d.type, cell: (o) => o.type },
    {
      id: 'status',
      header: d.status,
      cell: (o) => <OrderStatusBadge status={o.status} label={d.statuses[o.status]} />,
    },
    {
      id: 'total',
      header: d.total,
      cell: (o) => <span className="tabular-nums">{o.total}</span>,
      sortable: true,
      align: 'end',
    },
  ];
}

export function DataSection({ copy, idPrefix, orders }: DataSectionProps) {
  const d = copy.data;
  const columns = orderColumns(copy);
  const states = [
    ['data', d.stateData],
    ['loading', d.stateLoading],
    ['empty', d.stateEmpty],
    ['error', d.stateError],
  ] as const;
  return (
    <ShowcaseSection title={copy.sections.data}>
      <div className="flex flex-wrap items-center gap-4">
        <SearchInput
          aria-label={d.search}
          placeholder={d.searchPlaceholder}
          clearLabel={d.clear}
          onValueChange={orders.onSearchChange}
          className="max-w-sm"
        />
        <RadioGroup
          value={orders.tableState}
          onValueChange={orders.onTableStateChange}
          aria-label={d.state}
          className="flex flex-wrap gap-4"
        >
          {states.map(([value, label]) => (
            <div key={value} className="flex items-center gap-2">
              <RadioGroupItem value={value} id={`${idPrefix}-state-${value}`} />
              <Label htmlFor={`${idPrefix}-state-${value}`}>{label}</Label>
            </div>
          ))}
        </RadioGroup>
        <div className="ms-auto">
          <DataTableColumnToggle
            columns={columns}
            columnVisibility={orders.columnVisibility}
            onColumnVisibilityChange={orders.onColumnVisibilityChange}
            label={d.columns}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={orders.rows}
        getRowId={(o) => o.id}
        isLoading={orders.isLoading}
        error={
          orders.hasError ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-destructive">
              <span>{d.errorText}</span>
              <Button variant="outline" size="sm" onClick={orders.onRetry}>
                {d.retry}
              </Button>
            </div>
          ) : undefined
        }
        emptyState={<p className="p-8 text-center text-muted-foreground">{d.emptyTitle}</p>}
        sort={orders.sort}
        onSortChange={orders.onSortChange}
        columnVisibility={orders.columnVisibility}
        stickyHeader
        containerClassName="max-h-96"
        labels={{ actions: d.actions, sortBy: d.sortBy }}
        rowActions={() => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton label={d.actions} icon={<MoreHorizontalIcon />} size="sm" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <EyeIcon aria-hidden />
                {d.view}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive">
                <XCircleIcon aria-hidden />
                {d.cancel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <NumberedPagination
        page={orders.page}
        pageCount={orders.pageCount}
        onPageChange={orders.onPageChange}
        formatNumber={orders.formatPage}
        labels={{
          navigation: d.pagination,
          previous: d.previous,
          next: d.next,
          page: (n) => `${d.page} ${orders.formatPage(n)}`,
          morePages: d.morePages,
        }}
      />
      <CursorPagination
        hasPrevious={orders.hasPrevious}
        hasNext={orders.hasNext}
        onPrevious={orders.onPrevious}
        onNext={orders.onNext}
        summary={d.cursorSummary}
        labels={{ navigation: d.pagination, previous: d.previous, next: d.next }}
      />

      <ShowcaseRow label={d.badgeVariants}>
        <Badge>default</Badge>
        <Badge variant="secondary">secondary</Badge>
        <Badge variant="outline">outline</Badge>
        <Badge variant="success">success</Badge>
        <Badge variant="warning">warning</Badge>
        <Badge variant="info">info</Badge>
        <Badge variant="destructive">destructive</Badge>
      </ShowcaseRow>
      <ShowcaseRow label={copy.sections.badges}>
        {(['new', 'preparing', 'ready', 'completed', 'cancelled'] as const).map((status) => (
          <OrderStatusBadge key={status} status={status} label={d.statuses[status]} />
        ))}
      </ShowcaseRow>
    </ShowcaseSection>
  );
}
