import {
  BanknoteIcon,
  ChefHatIcon,
  ClockIcon,
  HourglassIcon,
  ReceiptTextIcon,
  TrendingUpIcon,
  UtensilsIcon,
  XCircleIcon,
  ZapIcon,
} from 'lucide-react';

import {
  Badge,
  Button,
  EmptyState,
  Input,
  OpsRow,
  Panel,
  PanelHeader,
  RankedRow,
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

function BreakdownBars({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.id} className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-semibold tabular-nums">{row.amountLabel}</span>
            </div>
            <div className="bg-accent-2/15 h-2 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${row.widthPct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
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
    deltas,
    live,
    recentRows,
    onViewAllOrders,
    paymentBars,
    typeBars,
    topItems,
    labels,
  } = props;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <OrgActions orgSwitcher={orgSwitcher} />
      </div>
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={String(i)} className="h-28 w-full" />
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
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <StatCard
              icon={<BanknoteIcon />}
              label={labels.sales}
              value={stats.sales}
              delta={deltas?.sales?.label}
              trend={deltas?.sales?.trend}
              deltaHint={deltas?.sales ? labels.kpiHint : undefined}
            />
            <StatCard
              icon={<ReceiptTextIcon />}
              label={labels.orders}
              value={stats.orders}
              delta={deltas?.orders?.label}
              trend={deltas?.orders?.trend}
              deltaHint={deltas?.orders ? labels.kpiHint : undefined}
            />
            <StatCard
              icon={<TrendingUpIcon />}
              label={labels.averageTicket}
              value={stats.averageTicket}
              delta={deltas?.averageTicket?.label}
              trend={deltas?.averageTicket?.trend}
              deltaHint={deltas?.averageTicket ? labels.kpiHint : undefined}
            />
            <StatCard icon={<ClockIcon />} label={labels.unpaid} value={stats.unpaid} />
            <StatCard icon={<XCircleIcon />} label={labels.cancelled} value={stats.cancelled} />
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.55fr_1fr]">
            <Panel>
              <PanelHeader title={labels.salesBreakdown} description={labels.salesBreakdownHint} />
              <div className="grid gap-6 md:grid-cols-2">
                <BreakdownBars title={labels.paymentBreakdown} rows={paymentBars} />
                <BreakdownBars title={labels.typeBreakdown} rows={typeBars} />
              </div>
            </Panel>
            <Panel>
              <PanelHeader
                title={labels.liveOps}
                description={labels.liveOpsHint}
                action={
                  <Badge variant="ready">
                    <span aria-hidden className="size-1.5 rounded-full bg-current" />
                    {labels.livePill}
                  </Badge>
                }
              />
              <div className="flex flex-col">
                <OpsRow
                  icon={<UtensilsIcon />}
                  title={labels.openOrders}
                  hint={labels.openOrdersHint}
                  value={live.open}
                />
                <OpsRow
                  icon={<HourglassIcon />}
                  title={labels.waiting}
                  hint={labels.waitingHint}
                  value={live.waiting}
                />
                <OpsRow
                  icon={<ChefHatIcon />}
                  title={labels.readyOrders}
                  hint={labels.readyHint}
                  value={live.ready}
                />
                <OpsRow
                  icon={<ZapIcon />}
                  title={labels.oldest}
                  hint={labels.oldestHint}
                  value={live.oldest}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={live.onOpenKitchen}
              >
                {labels.openKitchen}
              </Button>
            </Panel>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.55fr_1fr]">
            <Panel className="overflow-x-auto">
              <PanelHeader
                title={labels.recent}
                description={labels.recentHint}
                action={
                  <Button type="button" variant="ghost" size="sm" onClick={onViewAllOrders}>
                    {labels.viewAll}
                  </Button>
                }
              />
              {recentRows.length === 0 ? (
                <p className="text-muted-foreground text-sm">{labels.noRecent}</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr className="text-muted-foreground bg-table-head text-xs uppercase tracking-wide">
                        <th className="border-b px-3 py-2.5 text-start font-semibold">
                          {labels.colOrder}
                        </th>
                        <th className="border-b px-3 py-2.5 text-start font-semibold">
                          {labels.colTime}
                        </th>
                        <th className="border-b px-3 py-2.5 text-start font-semibold">
                          {labels.colWhere}
                        </th>
                        <th className="border-b px-3 py-2.5 text-start font-semibold">
                          {labels.colItems}
                        </th>
                        <th className="border-b px-3 py-2.5 text-end font-semibold">
                          {labels.colAmount}
                        </th>
                        <th className="border-b px-3 py-2.5 text-start font-semibold">
                          {labels.colStatus}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRows.map((row) => (
                        <tr
                          key={row.id}
                          className="even:bg-table-alt hover:bg-table-hover [&:last-child>td]:border-b-0"
                        >
                          <td className="border-b px-3 py-2.5 font-semibold tabular-nums">
                            {row.number}
                          </td>
                          <td className="border-b px-3 py-2.5 tabular-nums">{row.time}</td>
                          <td className="border-b px-3 py-2.5">{row.where}</td>
                          <td className="border-b px-3 py-2.5">{row.items}</td>
                          <td className="border-b px-3 py-2.5 text-end font-semibold tabular-nums">
                            {row.total}
                          </td>
                          <td className="border-b px-3 py-2.5">
                            <Badge variant={row.status}>{row.statusLabel}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
            <Panel>
              <PanelHeader title={labels.popular} description={labels.popularHint} />
              {topItems.length === 0 ? (
                <p className="text-muted-foreground text-sm">{labels.empty}</p>
              ) : (
                <div className="flex flex-col">
                  {topItems.slice(0, 5).map((row, index) => (
                    <RankedRow
                      key={row.id}
                      rank={index + 1}
                      title={row.name}
                      count={row.quantity}
                      amount={row.revenue}
                    />
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </>
      ) : null}
    </div>
  );
}
