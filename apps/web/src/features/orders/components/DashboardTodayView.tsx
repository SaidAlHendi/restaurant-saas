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
      <div className="flex flex-wrap items-end gap-3">
        <Button type="button" variant="outline" onClick={onSelectToday}>
          {labels.pickToday}
        </Button>
        <Button type="button" variant="outline" onClick={onSelectYesterday}>
          {labels.pickYesterday}
        </Button>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="today-date">
            {labels.dateLabel}
          </label>
          <Input
            id="today-date"
            type="date"
            value={selectedDate}
            onChange={(e) => {
              onDateInputChange(e.target.value);
            }}
          />
        </div>
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
            <StatCard label={labels.sales} value={stats.sales} />
            <StatCard label={labels.orders} value={stats.orders} />
            <StatCard label={labels.averageTicket} value={stats.averageTicket} />
            <StatCard label={labels.unpaid} value={stats.unpaid} />
            <StatCard label={labels.cancelled} value={stats.cancelled} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold">{labels.paymentBreakdown}</h3>
              <div className="flex flex-col gap-3">
                {paymentBars.map((row) => (
                  <div key={row.id} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span>{row.label}</span>
                      <span className="tabular-nums">{row.amountLabel}</span>
                    </div>
                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${row.widthPct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold">{labels.typeBreakdown}</h3>
              <div className="flex flex-col gap-3">
                {typeBars.map((row) => (
                  <div key={row.id} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span>{row.label}</span>
                      <span className="tabular-nums">{row.amountLabel}</span>
                    </div>
                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${row.widthPct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <Card className="overflow-x-auto p-4">
            <h3 className="mb-3 text-sm font-semibold">{labels.topItems}</h3>
            {topItems.length === 0 ? (
              <p className="text-muted-foreground text-sm">{labels.empty}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-start">
                    <th className="p-2">{labels.topItemsName}</th>
                    <th className="p-2">{labels.topItemsQty}</th>
                    <th className="p-2">{labels.topItemsRevenue}</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="p-2">{row.name}</td>
                      <td className="p-2 tabular-nums">{row.quantity}</td>
                      <td className="p-2 tabular-nums">{row.revenue}</td>
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
