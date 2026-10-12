import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@app/ui';

import type { DashboardOrdersPageViewModel } from '../hooks/use-dashboard-orders-page.js';
import { DashboardOrgSwitcherActions } from './DashboardOrgSwitcherActions.js';

export type DashboardOrdersViewProps = DashboardOrdersPageViewModel;

export function DashboardOrdersView(props: DashboardOrdersViewProps) {
  const {
    orgSwitcher,
    branchContextError,
    branchContextLoading,
    filters,
    search,
    status,
    type,
    paymentMethod,
    statusOptions,
    typeOptions,
    paymentMethodOptions,
    period,
    rows,
    showEmptyState,
    isLoading,
    isError,
    loadMore,
    onRetry,
    labels,
  } = props;

  if (branchContextError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title={labels.title}
          actions={<DashboardOrgSwitcherActions {...orgSwitcher} />}
        />
        <EmptyState
          title={labels.branchDateError}
          action={
            <Button type="button" variant="outline" onClick={onRetry}>
              {labels.retry}
            </Button>
          }
        />
      </div>
    );
  }

  const tableColumns = [
    { id: 'orderNumber', header: labels.colNumber, cell: (row: (typeof rows)[number]) => row.orderNumber },
    { id: 'dateTime', header: labels.colDateTime, cell: (row: (typeof rows)[number]) => row.dateTimeLabel },
    { id: 'customer', header: labels.colCustomer, cell: (row: (typeof rows)[number]) => row.typeTable },
    { id: 'items', header: labels.colItems, cell: (row: (typeof rows)[number]) => row.itemCount, align: 'end' as const },
    { id: 'total', header: labels.colTotal, cell: (row: (typeof rows)[number]) => row.totalLabel, align: 'end' as const },
    {
      id: 'status',
      header: labels.colStatus,
      cell: (row: (typeof rows)[number]) => (
        <Badge variant={row.statusTone}>{row.statusLabel}</Badge>
      ),
    },
    {
      id: 'payment',
      header: labels.colPayment,
      cell: (row: (typeof rows)[number]) => (
        <span className="flex flex-col gap-0.5">
          <Badge variant="outline">{row.paymentLabel}</Badge>
          {row.paymentMethodsLabel.length > 0 ? (
            <span className="text-muted-foreground text-xs">{row.paymentMethodsLabel}</span>
          ) : null}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={labels.title} actions={<DashboardOrgSwitcherActions {...orgSwitcher} />} />
      <div className="flex flex-col gap-3">
        <SearchInput
          key={`${filters?.dateFrom ?? ''}-${filters?.q ?? ''}`}
          defaultValue={search.value}
          onValueChange={search.onChange}
          delay={300}
          placeholder={search.placeholder}
          clearLabel={search.clearLabel}
        />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Select value={status.value} onValueChange={status.onChange}>
            <SelectTrigger>
              <SelectValue placeholder={labels.status} />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type.value} onValueChange={type.onChange}>
            <SelectTrigger>
              <SelectValue placeholder={labels.type} />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentMethod.value} onValueChange={paymentMethod.onChange}>
            <SelectTrigger>
              <SelectValue placeholder={labels.payment} />
            </SelectTrigger>
            <SelectContent>
              {paymentMethodOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period.value} onValueChange={period.onChange}>
            <SelectTrigger>
              <SelectValue placeholder={labels.period} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{labels.periodToday}</SelectItem>
              <SelectItem value="yesterday">{labels.periodYesterday}</SelectItem>
              <SelectItem value="last7">{labels.periodLast7}</SelectItem>
              <SelectItem value="last30">{labels.periodLast30}</SelectItem>
              <SelectItem value="custom">{labels.periodCustom}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {period.value === 'custom' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="orders-from">
                {labels.from}
              </label>
              <Input
                id="orders-from"
                type="date"
                value={period.customFrom}
                onChange={(e) => {
                  period.onCustomFromChange(e.target.value);
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="orders-to">
                {labels.to}
              </label>
              <Input
                id="orders-to"
                type="date"
                value={period.customTo}
                onChange={(e) => {
                  period.onCustomToChange(e.target.value);
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
      {branchContextLoading || (isLoading && rows.length === 0) ? (
        <div className="flex justify-center py-12">
          <Spinner label={labels.loading} />
        </div>
      ) : null}
      {isError ? (
        <EmptyState
          title={labels.error}
          action={
            <Button type="button" variant="outline" onClick={onRetry}>
              {labels.retry}
            </Button>
          }
        />
      ) : null}
      {!branchContextLoading && !isError && filters ? (
        <>
          <div className="hidden md:block">
            <DataTable
              columns={tableColumns}
              data={rows}
              getRowId={(row) => row.id}
              isLoading={isLoading}
              emptyState={showEmptyState ? <EmptyState title={labels.empty} /> : null}
              labels={{ sortBy: labels.tableSortBy, actions: labels.tableRowActions }}
              onRowClick={(row) => {
                row.onSelect();
              }}
            />
          </div>
          <div className="flex flex-col gap-3 md:hidden">
            {showEmptyState ? <EmptyState title={labels.empty} /> : null}
            {rows.map((row) => (
              <Card
                key={row.id}
                className="cursor-pointer p-4"
                onClick={() => {
                  row.onSelect();
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold tabular-nums">#{row.orderNumber}</span>
                  <Badge variant={row.statusTone}>{row.statusLabel}</Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">{row.dateTimeLabel}</p>
                <p className="mt-1 text-sm">{row.typeTable}</p>
                <div className="mt-2 flex justify-between text-sm tabular-nums">
                  <span>{row.itemCount}</span>
                  <span>{row.totalLabel}</span>
                </div>
              </Card>
            ))}
          </div>
          {loadMore ? (
            <Button
              type="button"
              variant="outline"
              disabled={loadMore.loading}
              onClick={loadMore.onClick}
            >
              {loadMore.label}
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
