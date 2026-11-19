import {
  BanIcon,
  CoinsIcon,
  PencilLineIcon,
  PlusIcon,
  RotateCcwIcon,
  SendIcon,
  Trash2Icon,
  Undo2Icon,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

import { Badge, Button, Card, Skeleton } from '@app/ui';

import type { DetailsRow, OrderDetailsModel } from './order-details.model.js';

export type OrderDetailsBodyLabels = {
  items: string;
  info: string;
  totals: string;
  payments: string;
  timeline: string;
  timestamps: string;
  noItems: string;
  noPayments: string;
  noEvents: string;
  eventsError: string;
  loadingTimeline: string;
  addedLater: string;
  tendered: string;
  change: string;
  by: string;
  approvedBy: string;
  reason: string;
  each: string;
  voidItem: string;
};

export type OrderDetailsBodyViewProps = {
  model: OrderDetailsModel;
  labels: OrderDetailsBodyLabels;
  /** POS collapses the timeline and loads it when opened; the dashboard shows it open. */
  timeline: { collapsible: boolean; onToggle?: (open: boolean) => void; loading: boolean };
  className?: string;
};

function DetailCard({ id, title, children, className }: { id: string; title: string; children: ReactNode; className?: string }) {
  return (
    <Card className={`gap-0 rounded-md p-4 ${className ?? ''}`} role="region" aria-labelledby={id}>
      <h3 id={id} className="text-muted-foreground mb-3 text-sm font-semibold">
        {title}
      </h3>
      {children}
    </Card>
  );
}

function RowList({ rows }: { rows: (DetailsRow & { strong?: boolean })[] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {rows.map((row) => (
        <div key={row.key} className="col-span-2 grid grid-cols-subgrid">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className={`text-end tabular-nums ${row.strong ? 'font-semibold' : ''}`}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const EVENT_ICON: Record<string, ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  status: SendIcon,
  items: PlusIcon,
  payment: CoinsIcon,
  cancel: BanIcon,
  reopen: RotateCcwIcon,
  undo: Undo2Icon,
  default: PencilLineIcon,
};

export function OrderDetailsBodyView({ model, labels, timeline, className }: OrderDetailsBodyViewProps) {
  const timelineBody = !model.timeline.loaded ? (
    timeline.loading ? (
      <div aria-label={labels.loadingTimeline} className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4" />
      </div>
    ) : null
  ) : model.timeline.error ? (
    <p role="alert" className="text-destructive text-sm">{labels.eventsError}</p>
  ) : model.timeline.rows.length === 0 ? (
    <p className="text-muted-foreground text-sm">{labels.noEvents}</p>
  ) : (
    <ol className="flex flex-col">
      {model.timeline.rows.map((row, index) => {
        const Icon = EVENT_ICON[row.icon] ?? PencilLineIcon;
        const last = index === model.timeline.rows.length - 1;
        return (
          <li key={row.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!last ? <span aria-hidden className="bg-border absolute start-3.5 top-7 bottom-0 w-px" /> : null}
            <span
              className={`z-10 flex size-7 shrink-0 items-center justify-center rounded-full border ${
                row.icon === 'cancel' ? 'border-destructive/40 text-destructive' : row.icon === 'reopen' || row.icon === 'undo' ? 'border-warning/50 text-warning' : 'text-muted-foreground bg-card'
              }`}
            >
              <Icon aria-hidden className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">{row.label}</p>
              {row.reason ? (
                <p className="text-muted-foreground">{labels.reason}: {row.reason}</p>
              ) : null}
              <p className="text-muted-foreground text-xs">
                <time dateTime={row.iso} title={row.absolute}>{row.relative}</time>
                {' · '}
                <span className="tabular-nums">{row.absolute}</span>
              </p>
              {row.actor || row.approver ? (
                <p className="text-muted-foreground text-xs">
                  {row.actor ? `${labels.by}: ${row.actor}` : ''}
                  {row.actor && row.approver ? ' · ' : ''}
                  {row.approver ? `${labels.approvedBy}: ${row.approver}` : ''}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className={`grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] ${className ?? ''}`}>
      <div className="flex min-w-0 flex-col gap-4">
        <DetailCard id="od-items" title={labels.items}>
          {model.items.count === 0 ? (
            <p className="text-muted-foreground text-sm">{labels.noItems}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {model.items.groups.map((group) => (
                <div key={group.key}>
                  {group.title ? (
                    <h4 className="text-muted-foreground mb-1 text-xs font-semibold">{group.title}</h4>
                  ) : null}
                  <ul className="divide-border divide-y">
                    {group.items.map((item) => (
                      <li key={item.id} className="flex items-start justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                        <div className={`min-w-0 flex-1 ${item.voided ? 'text-muted-foreground' : ''}`}>
                          <p className={`font-medium ${item.voided ? 'line-through' : ''}`}>
                            <bdi className="tabular-nums" dir="ltr">{item.quantity}×</bdi> {item.name}
                          </p>
                          {item.modifiers.length > 0 ? (
                            <ul className="text-muted-foreground text-xs">
                              {item.modifiers.map((m) => (
                                <li key={m.id}>
                                  + {m.name}
                                  {m.delta ? <span className="tabular-nums"> ({m.delta})</span> : null}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {item.note ? <p className="text-xs italic">“{item.note}”</p> : null}
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge variant={item.statusVariant}>{item.statusLabel}</Badge>
                            {item.isAddition ? <Badge variant="secondary">{labels.addedLater}</Badge> : null}
                          </div>
                          {item.voidNote ? (
                            <p className="text-destructive mt-1 text-xs">{item.voidNote}</p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1 text-end">
                          <span className={`font-semibold tabular-nums ${item.voided ? 'line-through' : ''}`}>{item.lineTotal}</span>
                          {item.quantity > 1 ? (
                            <span className="text-muted-foreground text-xs tabular-nums">{item.unitPrice} {labels.each}</span>
                          ) : null}
                          {item.onVoid ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="group text-destructive hover:text-destructive min-h-11"
                              onClick={item.onVoid}
                            >
                              <Trash2Icon aria-hidden className="transition-transform duration-200 motion-safe:group-hover:-rotate-12 motion-safe:group-active:scale-75" />
                              {labels.voidItem}
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </DetailCard>
        {timeline.collapsible ? (
          <Card className="gap-0 rounded-md p-4" role="region" aria-labelledby="od-timeline">
            <details
              onToggle={(event) => {
                timeline.onToggle?.(event.currentTarget.open);
              }}
            >
              <summary className="min-h-11 cursor-pointer text-sm font-semibold">
                <h3 id="od-timeline" className="text-muted-foreground inline">{labels.timeline}</h3>
              </summary>
              <div className="pt-3">{timelineBody}</div>
            </details>
          </Card>
        ) : (
          <DetailCard id="od-timeline" title={labels.timeline}>{timelineBody}</DetailCard>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <DetailCard id="od-totals" title={labels.totals}>
          <RowList rows={model.totals.rows} />
          {model.totals.baseTotal || model.totals.rate ? (
            <div className="mt-3 border-t pt-3">
              <RowList rows={[model.totals.baseTotal, model.totals.rate].filter((row): row is DetailsRow => row !== null)} />
            </div>
          ) : null}
        </DetailCard>
        <DetailCard id="od-payments" title={labels.payments}>
          {model.payments.length === 0 ? (
            <p className="text-muted-foreground text-sm">{labels.noPayments}</p>
          ) : (
            <ul className="divide-border divide-y">
              {model.payments.map((payment) => (
                <li key={payment.id} className="py-2 text-sm first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{payment.method}</span>
                    <span className="font-semibold tabular-nums">{payment.amount}</span>
                  </div>
                  <p className="text-muted-foreground text-xs tabular-nums">{payment.time}</p>
                  {payment.tendered ? (
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {labels.tendered}: {payment.tendered}
                      {payment.change ? ` · ${labels.change}: ${payment.change}` : ''}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </DetailCard>
        <DetailCard id="od-info" title={labels.info}>
          <RowList rows={model.info} />
        </DetailCard>
        <DetailCard id="od-times" title={labels.timestamps}>
          <RowList rows={model.timestamps} />
        </DetailCard>
      </div>
    </div>
  );
}

/** Skeleton shown while the order loads, so the sheet is never a spinner on a blank page. */
export function OrderDetailsSkeletonView({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-4">
      <Skeleton className="h-16 w-full" />
      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    </div>
  );
}
