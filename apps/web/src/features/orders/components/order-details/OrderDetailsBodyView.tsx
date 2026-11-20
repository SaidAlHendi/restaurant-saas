import { Trash2Icon } from 'lucide-react';
import type { ReactNode } from 'react';

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

export function OrderDetailsBodyView({ model, labels, className }: OrderDetailsBodyViewProps) {
  return (
    <div className={`flex flex-col gap-4 ${className ?? ''}`}>
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
      </div>
    </div>
  );
}

/** Skeleton shown while the order loads, so the sheet is never a spinner on a blank page. */
export function OrderDetailsSkeletonView({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-4">
      <Skeleton className="h-16 w-full" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
