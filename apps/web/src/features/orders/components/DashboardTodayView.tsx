import { BanknoteIcon, ClockIcon, ReceiptTextIcon, TrendingUpIcon, XCircleIcon } from 'lucide-react';

import {
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Skeleton,
  StatCard,
} from '@app/ui';

import type { DashboardTodayPageViewModel } from '../hooks/use-dashboard-today-page.js';
import type { OrgSwitcherViewModel } from '../hooks/use-org-switcher.js';
import { DashboardOrgSwitcherActions } from './DashboardOrgSwitcherActions.js';

export type DashboardTodayViewProps = DashboardTodayPageViewModel;

function OrgActions({ orgSwitcher }: { orgSwitcher: OrgSwitcherViewModel }) {
  return <DashboardOrgSwitcherActions {...orgSwitcher} />;
}

type BreakdownRow = { id: string; label: string; amountLabel: string; widthPct: string };

function BreakdownCard({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  return (
    <Card className="gap-4 p-5">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="flex flex-col gap-4">
        {rows.map((row) => (
          <div key={row.id} className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-semibold tabular-nums">{row.amountLabel}</span>
            </div>
            <div className="bg-muted h-2.5 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${row.widthPct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function DashboardTodayView(props: DashboardTodayViewProps) {
  const {
    orgSwitcher,
    isLoading,
    isError,
    onRetry,
    selectedDate,
    onSelectToday,
    onSelectYesterday,
    onDateInputChange,
    stats,
    paymentBars,
    typeBars,
    topItems,
    labels,
  } = props;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={labels.title} actions={<OrgActions orgSwitcher={orgSwitcher} />} />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onSelectToday}>
          {labels.pickToday}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onSelectYesterday}>
          {labels.pickYesterday}
        </Button>
        <label className="sr-only" htmlFor="today-date">
          {labels.dateLabel}
        </label>
        <Input
          id="today-date"
          type="date"
          aria-label={labels.dateLabel}
          className="h-9 w-auto"
          value={selectedDate}
          onChange={(e) => {
            onDateInputChange(e.target.value);
          }}
        />
      </div>
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={String(i)} className="h-24 w-full" />
          ))}
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
      {!isLoading && !isError && stats ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <StatCard emphasis icon={<BanknoteIcon />} label={labels.sales} value={stats.sales} />
            <StatCard icon={<ReceiptTextIcon />} label={labels.orders} value={stats.orders} />
            <StatCard icon={<TrendingUpIcon />} label={labels.averageTicket} value={stats.averageTicket} />
            <StatCard icon={<ClockIcon />} label={labels.unpaid} value={stats.unpaid} />
            <StatCard icon={<XCircleIcon />} label={labels.cancelled} value={stats.cancelled} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <BreakdownCard title={labels.paymentBreakdown} rows={paymentBars} />
            <BreakdownCard title={labels.typeBreakdown} rows={typeBars} />
          </div>
          <Card className="gap-4 overflow-x-auto p-5">
            <h3 className="text-base font-semibold">{labels.topItems}</h3>
            {topItems.length === 0 ? (
              <p className="text-muted-foreground text-sm">{labels.empty}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-xs font-medium">
                    <th className="p-2 text-start font-medium">{labels.topItemsName}</th>
                    <th className="p-2 text-end font-medium">{labels.topItemsQty}</th>
                    <th className="p-2 text-end font-medium">{labels.topItemsRevenue}</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="p-2 font-medium">{row.name}</td>
                      <td className="p-2 text-end tabular-nums">{row.quantity}</td>
                      <td className="p-2 text-end tabular-nums">{row.revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
