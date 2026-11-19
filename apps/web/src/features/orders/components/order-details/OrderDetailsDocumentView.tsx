import { BanIcon, CheckIcon, CircleDashedIcon, Trash2Icon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge, Button, Skeleton } from '@app/ui';

import type { OrderDetailsModel } from './order-details.model.js';
import type { OrderDetailsBodyLabels } from './OrderDetailsBodyView.js';

export type OrderDetailsDocumentViewProps = {
  model: OrderDetailsModel;
  labels: OrderDetailsBodyLabels & {
    orderNumber: string;
    progress: string;
    business: string;
    created: string;
    due: string;
    pager: string;
    customer: string;
    notes: string;
    createdBy: string;
  };
  timelineLoading: boolean;
  /** Sticky action bar, rendered at the bottom of the paper. */
  actions?: ReactNode;
};

/** One price line: name, a dotted leader, the amount. Used for items, totals and payments. */
function Leader({ left, right, strong, muted }: { left: ReactNode; right: ReactNode; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-baseline gap-2 ${strong ? 'font-semibold' : ''} ${muted ? 'text-muted-foreground' : ''}`}>
      <span className="min-w-0">{left}</span>
      <span aria-hidden className="border-border mb-1 min-w-4 flex-1 border-b border-dotted" />
      <span className="tabular-nums">{right}</span>
    </div>
  );
}

/**
 * The dashboard order page: the order as a ticket (header, progress, ledger, totals, payments on one
 * surface) with the details and the timeline as plain notes in the margin. No card per section.
 */
export function OrderDetailsDocumentView({ model, labels, timelineLoading, actions }: OrderDetailsDocumentViewProps) {
  const { header, stepper } = model;
  const cancelled = stepper.mode === 'cancelled';
  const firstDate = model.facts.times[0]?.date ?? '';
  const sameDay = model.facts.times.every((row) => row.date === firstDate);
  return (
    <div className="bg-card grid overflow-hidden rounded-md border lg:grid-cols-[minmax(0,1fr)_18rem]">
      <article aria-label={labels.orderNumber} className="min-w-0">
        <header className="flex flex-col gap-5 p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <h2 className="text-4xl leading-none font-bold tracking-tight tabular-nums sm:text-5xl">
                {labels.orderNumber}
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                {header.typeLabel}
                {header.whereLabel ? `, ${header.whereLabel}` : ''}
                <span className="ms-3 tabular-nums">{labels.business} {header.businessDate}</span>
              </p>
            </div>
            <div className="text-end">
              <p className="text-3xl leading-none font-bold tabular-nums">{header.total}</p>
              {header.due ? (
                <p className="text-warning mt-1.5 text-sm font-medium tabular-nums">{labels.due} {header.due}</p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={header.statusVariant} data-status={header.status}>{header.statusLabel}</Badge>
            <Badge variant={header.paymentVariant}>{header.paymentLabel}</Badge>
          </div>
          {stepper.mode === 'flow' ? (
            <ol aria-label={labels.progress} className="grid grid-cols-4">
              {stepper.steps.map((step) => (
                <li key={step.key} aria-current={step.state === 'current' ? 'step' : undefined} className="relative flex min-w-0 flex-col gap-1 pt-5">
                  <span aria-hidden className={`absolute inset-x-0 top-1.5 h-0.5 ${step.state === 'done' ? 'bg-success' : 'bg-border'}`} />
                  <span
                    aria-hidden
                    className={`absolute start-0 top-0 flex size-3.5 items-center justify-center rounded-full ${
                      step.state === 'done' ? 'bg-success text-success-foreground' : step.state === 'current' ? 'bg-primary ring-primary/25 ring-4' : 'bg-border'
                    }`}
                  >
                    {step.state === 'done' ? <CheckIcon className="size-2.5" /> : null}
                  </span>
                  <span className={`truncate text-sm ${step.state === 'current' ? 'font-semibold' : step.state === 'upcoming' ? 'text-muted-foreground' : ''}`}>
                    {step.label}
                  </span>
                  {step.time && step.state !== 'upcoming' ? (
                    <span className="text-muted-foreground text-xs tabular-nums">{step.time}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : stepper.note ? (
            <p className={`flex items-center gap-2 text-sm ${cancelled ? 'text-destructive' : 'text-muted-foreground'}`}>
              {cancelled ? <BanIcon aria-hidden className="size-4 shrink-0" /> : <CircleDashedIcon aria-hidden className="size-4 shrink-0" />}
              {stepper.note}
            </p>
          ) : null}
        </header>

        <section aria-labelledby="doc-items" className="border-t px-5 py-5 sm:px-7">
          <h3 id="doc-items" className="mb-3 text-base font-semibold">{labels.items}</h3>
          {model.items.count === 0 ? (
            <p className="text-muted-foreground text-sm">{labels.noItems}</p>
          ) : (
            <div className="flex flex-col gap-5">
              {model.items.groups.map((group) => (
                <div key={group.key}>
                  {group.title ? <h4 className="text-muted-foreground mb-2 text-sm font-medium">{group.title}</h4> : null}
                  <ul className="flex flex-col gap-4">
                    {group.items.map((item) => (
                      <li key={item.id} className={item.voided ? 'text-muted-foreground' : ''}>
                        <Leader
                          strong
                          left={
                            <span className={item.voided ? 'line-through' : ''}>
                              <bdi dir="ltr" className="tabular-nums">{item.quantity}×</bdi> {item.name}
                            </span>
                          }
                          right={<span className={item.voided ? 'line-through' : ''}>{item.lineTotal}</span>}
                        />
                        <div className="ps-6 text-sm">
                          {item.modifiers.map((m) => (
                            <p key={m.id} className="text-muted-foreground">
                              + {m.name}
                              {m.delta ? <span className="tabular-nums"> ({m.delta})</span> : null}
                            </p>
                          ))}
                          {item.note ? <p className="text-muted-foreground italic">“{item.note}”</p> : null}
                          {item.quantity > 1 ? (
                            <p className="text-muted-foreground text-xs tabular-nums">{item.unitPrice} {labels.each}</p>
                          ) : null}
                          {item.voidNote ? <p className="text-destructive text-xs">{item.voidNote}</p> : null}
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge variant={item.statusVariant}>{item.statusLabel}</Badge>
                            {item.isAddition ? <Badge variant="secondary">{labels.addedLater}</Badge> : null}
                            {item.onVoid ? (
                              <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive h-7 px-2" onClick={item.onVoid}>
                                <Trash2Icon aria-hidden />
                                {labels.voidItem}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="doc-totals" className="border-t-2 px-5 py-5 sm:px-7">
          <h3 id="doc-totals" className="sr-only">{labels.totals}</h3>
          <div className="flex flex-col gap-1.5 text-sm">
            {model.totals.rows.map((row) => (
              <Leader
                key={row.key}
                left={row.label}
                right={row.value}
                strong={row.strong}
              />
            ))}
            {model.totals.baseTotal ? (
              <Leader muted left={model.totals.baseTotal.label} right={model.totals.baseTotal.value} />
            ) : null}
            {model.totals.rate ? (
              <Leader muted left={model.totals.rate.label} right={model.totals.rate.value} />
            ) : null}
          </div>
        </section>

        <section aria-labelledby="doc-payments" className="border-t border-dashed px-5 py-5 sm:px-7">
          <h3 id="doc-payments" className="mb-3 text-base font-semibold">{labels.payments}</h3>
          {model.payments.length === 0 ? (
            <p className="text-muted-foreground text-sm">{labels.noPayments}</p>
          ) : (
            <ul className="flex flex-col gap-3 text-sm">
              {model.payments.map((payment) => (
                <li key={payment.id}>
                  <Leader strong left={payment.method} right={payment.amount} />
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {payment.time}
                    {payment.tendered ? `, ${labels.tendered} ${payment.tendered}` : ''}
                    {payment.change ? `, ${labels.change} ${payment.change}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
        {actions ? <div className="border-t p-3">{actions}</div> : null}
      </article>

      <aside className="bg-muted/50 flex min-w-0 flex-col gap-8 border-t p-5 sm:p-7 lg:border-s lg:border-t-0">
        <section aria-labelledby="doc-info">
          <h3 id="doc-info" className="mb-3 text-base font-semibold">{labels.info}</h3>
          <div className="flex flex-col gap-4 text-sm">
            {model.facts.pager || model.facts.customer ? (
              <div className="flex items-center gap-3">
                {model.facts.pager ? (
                  <div className="border-foreground/70 flex min-w-14 flex-col items-center rounded-md border-2 px-2 py-1">
                    <span className="text-muted-foreground text-[0.7rem] leading-tight">{labels.pager}</span>
                    <span className="text-2xl leading-none font-bold tabular-nums">{model.facts.pager}</span>
                  </div>
                ) : null}
                {model.facts.customer ? (
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-xs">{labels.customer}</p>
                    <p className="text-base font-medium break-words"><bdi>{model.facts.customer}</bdi></p>
                  </div>
                ) : null}
              </div>
            ) : null}
            {model.facts.notes ? (
              <blockquote className="border-warning bg-warning/10 rounded-e-md border-s-4 py-2 pe-3 ps-3">
                <p className="text-muted-foreground text-xs">{labels.notes}</p>
                <p className="break-words">{model.facts.notes}</p>
              </blockquote>
            ) : null}
            {model.facts.createdBy ? (
              <p>
                <span className="text-muted-foreground">{labels.createdBy}</span>{' '}
                <bdi className="font-medium">{model.facts.createdBy}</bdi>
              </p>
            ) : null}
            <dl className="border-t pt-3">
              {sameDay ? <p className="text-muted-foreground mb-1.5 text-xs tabular-nums">{firstDate}</p> : null}
              {model.facts.times.map((row) => (
                <div key={row.key} className="flex items-baseline justify-between gap-3 py-0.5">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="tabular-nums">
                    <span className="font-medium">{row.time}</span>
                    {sameDay ? null : <span className="text-muted-foreground ms-2 text-xs">{row.date}</span>}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-muted-foreground border-t pt-3 text-xs tabular-nums">
              {model.facts.currency}
              {model.facts.version ? `, ${model.facts.version}` : ''}
            </p>
          </div>
        </section>
        <section aria-labelledby="doc-timeline">
          <h3 id="doc-timeline" className="mb-3 text-base font-semibold">{labels.timeline}</h3>
          {!model.timeline.loaded ? (
            timelineLoading ? (
              <div aria-label={labels.loadingTimeline} className="flex flex-col gap-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
              </div>
            ) : null
          ) : model.timeline.error ? (
            <p role="alert" className="text-destructive text-sm">{labels.eventsError}</p>
          ) : model.timeline.rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">{labels.noEvents}</p>
          ) : (
            <ol className="border-border ms-1 border-s">
              {model.timeline.rows.map((row) => {
                const flagged = row.icon === 'cancel' || row.icon === 'reopen' || row.icon === 'undo';
                return (
                  <li key={row.id} className="relative pb-4 ps-4 text-sm last:pb-0">
                    <span
                      aria-hidden
                      className={`absolute -start-[4.5px] top-1.5 size-2 rounded-full ${row.icon === 'cancel' ? 'bg-destructive' : flagged ? 'bg-warning' : 'bg-muted-foreground'}`}
                    />
                    <p className={flagged ? 'font-medium' : ''}>{row.label}</p>
                    {row.reason ? <p className="text-muted-foreground">“{row.reason}”</p> : null}
                    <p className="text-muted-foreground text-xs">
                      <time dateTime={row.iso} title={row.absolute}>{row.relative}</time>
                    </p>
                    {row.actor || row.approver ? (
                      <p className="text-muted-foreground text-xs">
                        {row.actor ? `${labels.by} ${row.actor}` : ''}
                        {row.actor && row.approver ? ', ' : ''}
                        {row.approver ? `${labels.approvedBy} ${row.approver}` : ''}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </aside>
    </div>
  );
}
