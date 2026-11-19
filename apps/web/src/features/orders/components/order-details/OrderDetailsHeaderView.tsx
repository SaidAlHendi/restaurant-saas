import {
  BanIcon,
  BellRingIcon,
  CheckCheckIcon,
  CheckIcon,
  CircleDashedIcon,
  CookingPotIcon,
  SendIcon,
  Undo2Icon,
} from 'lucide-react';
import type { ComponentType } from 'react';

import { Badge } from '@app/ui';

import type { OrderDetailsModel } from './order-details.model.js';

const STATUS_ICON: Record<string, ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  draft: CircleDashedIcon,
  placed: SendIcon,
  preparing: CookingPotIcon,
  ready: BellRingIcon,
  completed: CheckCheckIcon,
  cancelled: BanIcon,
  refunded: Undo2Icon,
};

export type OrderDetailsHeaderViewProps = {
  header: OrderDetailsModel['header'];
  stepper: OrderDetailsModel['stepper'];
  /** `number` is the translated "Order #12" title, `meta` the accessible name of the progress list. */
  labels: { orderNumber: string; progress: string; business: string; created: string; due: string };
  /** Hide the big total in the header (the dashboard page shows it in its own summary). */
  showTotal?: boolean;
  className?: string;
};

/** Number, colour-coded status, payment status, where, and the Placed → Completed stepper. */
export function OrderDetailsHeaderView({
  header,
  stepper,
  labels,
  showTotal = true,
  className,
}: OrderDetailsHeaderViewProps) {
  const StatusIcon = STATUS_ICON[header.status] ?? CircleDashedIcon;
  return (
    <div className={className} data-testid="order-details-header">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-2xl leading-tight font-bold tabular-nums">{labels.orderNumber}</p>
          <p className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 text-xs tabular-nums">
            <span>{header.typeLabel}{header.whereLabel ? ` · ${header.whereLabel}` : ''}</span>
            <span>{labels.business}: {header.businessDate}</span>
            <span>{labels.created}: {header.createdAt}</span>
          </p>
        </div>
        {showTotal ? (
          <div className="text-end">
            <p className="text-2xl leading-tight font-bold tabular-nums">{header.total}</p>
            {header.due ? (
              <p className="text-warning text-xs font-medium tabular-nums">{labels.due}: {header.due}</p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge variant={header.statusVariant} data-status={header.status}>
          <StatusIcon aria-hidden />
          {header.statusLabel}
        </Badge>
        <Badge variant={header.paymentVariant}>{header.paymentLabel}</Badge>
      </div>
      <div className="mt-3">
        {stepper.mode === 'flow' ? (
          <ol aria-label={labels.progress} className="grid grid-cols-4 gap-1.5">
            {stepper.steps.map((step) => (
              <li
                key={step.key}
                aria-current={step.state === 'current' ? 'step' : undefined}
                className="flex min-w-0 flex-col gap-1"
              >
                <span
                  className={`h-1.5 rounded-full ${
                    step.state === 'upcoming' ? 'bg-muted' : step.state === 'current' ? 'bg-primary' : 'bg-success'
                  }`}
                />
                <span
                  className={`flex items-center gap-1 truncate text-xs ${
                    step.state === 'current' ? 'text-foreground font-semibold' : 'text-muted-foreground'
                  }`}
                >
                  {step.state === 'done' ? <CheckIcon aria-hidden className="size-3 shrink-0" /> : null}
                  <span className="truncate">{step.label}</span>
                </span>
              </li>
            ))}
          </ol>
        ) : stepper.note ? (
          <p
            className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm ${
              stepper.mode === 'cancelled'
                ? 'border-destructive/40 text-destructive'
                : 'text-muted-foreground border-dashed'
            }`}
          >
            <StatusIcon aria-hidden className="size-4 shrink-0" />
            {stepper.note}
          </p>
        ) : null}
      </div>
    </div>
  );
}
