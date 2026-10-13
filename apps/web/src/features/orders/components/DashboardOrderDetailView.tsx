import { Link } from 'react-router-dom';

import { Badge, Card, EmptyState, PageHeader, Spinner } from '@app/ui';

import type { DashboardOrderDetailPageViewModel } from '../hooks/use-dashboard-order-detail-page.js';
import { DashboardOrgSwitcherActions } from './DashboardOrgSwitcherActions.js';

export type DashboardOrderDetailViewProps = DashboardOrderDetailPageViewModel;

export function DashboardOrderDetailView(props: DashboardOrderDetailViewProps) {
  const { orgSwitcher, backLink, isLoading, notFound, order, items, payments, timeline, labels } =
    props;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner label={labels.loading} />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="flex flex-col gap-4">
        <Link to={backLink.to} className="text-primary text-sm font-medium hover:underline">
          {backLink.label}
        </Link>
        <EmptyState title={labels.notFound} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link to={backLink.to} className="text-primary text-sm font-medium hover:underline">
        {backLink.label}
      </Link>
      <PageHeader
        title={`${labels.title} #${order.number}`}
        description={order.businessDate}
        actions={<DashboardOrgSwitcherActions {...orgSwitcher} />}
      />
      <div className="flex flex-wrap gap-2">
        <Badge variant={order.statusTone}>{order.statusLabel}</Badge>
        <Badge variant="outline">{order.paymentLabel}</Badge>
        <Badge variant="outline">{order.typeTable}</Badge>
      </div>
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">{labels.items}</h3>
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={item.voided ? 'text-muted-foreground line-through' : undefined}
            >
              <div className="flex justify-between gap-2">
                <span>
                  {item.name} × {item.quantity}
                  {item.isAddition ? (
                    <span className="text-primary ms-2 text-xs">{labels.addition}</span>
                  ) : null}
                </span>
                <span className="tabular-nums">{item.lineTotal}</span>
              </div>
              {item.modifiers.length > 0 ? (
                <p className="text-muted-foreground text-xs">{item.modifiers.join(', ')}</p>
              ) : null}
              {item.voided && item.voidReason ? (
                <p className="text-xs">
                  {labels.voidReason}: {item.voidReason}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">{labels.payments}</h3>
        <ul className="flex flex-col gap-2 text-sm">
          {payments.map((p) => (
            <li key={p.id} className="flex justify-between gap-2">
              <span>
                {p.method} — {p.time}
              </span>
              <span className="tabular-nums">{p.amount}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 grid gap-1 border-t pt-4 text-sm tabular-nums">
          <div className="flex justify-between gap-2">
            <span>{labels.subtotal}</span>
            <span>{order.totals.subtotal}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>{labels.tax}</span>
            <span>{order.totals.tax}</span>
          </div>
          <div className="flex justify-between gap-2 font-semibold">
            <span>{labels.total}</span>
            <span>{order.totals.total}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>{labels.paid}</span>
            <span>{order.totals.paid}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>{labels.due}</span>
            <span>{order.totals.due}</span>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">{labels.timeline}</h3>
        <ol className="flex flex-col gap-3">
          {timeline.map((row) => (
            <li key={row.id} className="border-s-2 border-border ps-3">
              <p className="text-sm">{row.label}</p>
              <p className="text-muted-foreground text-xs">
                {row.timeLabel}
                {row.actorName ? ` · ${labels.actor}: ${row.actorName}` : ''}
                {row.approverName ? ` · ${labels.approvedBy}: ${row.approverName}` : ''}
              </p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
