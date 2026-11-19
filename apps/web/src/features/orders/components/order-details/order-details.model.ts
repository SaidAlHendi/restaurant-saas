import type { TFunction } from 'i18next';

import { pickLocalizedText, type OrderDetail, type OrderEvent } from '@app/shared';

import { formatMoney, paymentCashLabels, type MoneyFormatter } from '../../../../lib/money.js';
import {
  mapOrderEventToTimelineRow,
  sortEventsChronological,
  type OrderTimelineRow,
} from '../../order-event-timeline.utils.js';
import {
  detailItemStatusVariant,
  detailPaymentVariant,
  detailStatusVariant,
  exchangeRateLabel,
  groupItemsBySeat,
  orderStepper,
  relativeTimeLabel,
  type DetailsBadgeVariant,
  type SeatGroup,
  type StepKey,
  type StepperMode,
  type StepState,
} from './order-details.utils.js';

export type DetailsRow = { key: string; label: string; value: string };

export type DetailsItemRow = {
  id: string;
  quantity: number;
  name: string;
  modifiers: { id: string; name: string; delta: string | null }[];
  note: string | null;
  unitPrice: string;
  lineTotal: string;
  statusLabel: string;
  statusVariant: DetailsBadgeVariant;
  isAddition: boolean;
  voided: boolean;
  /** "Reason · 14:02" for a voided line. */
  voidNote: string | null;
  onVoid: (() => void) | undefined;
};

export type DetailsPaymentRow = {
  id: string;
  method: string;
  amount: string;
  tendered: string | null;
  change: string | null;
  time: string;
};

export type DetailsTimelineRow = {
  id: string;
  icon: OrderTimelineRow['icon'];
  label: string;
  reason: string | null;
  actor: string | null;
  approver: string | null;
  relative: string;
  absolute: string;
  iso: string;
};

export type OrderDetailsModel = {
  header: {
    number: string;
    statusLabel: string;
    statusVariant: DetailsBadgeVariant;
    status: OrderDetail['status'];
    paymentLabel: string;
    paymentVariant: DetailsBadgeVariant;
    typeLabel: string;
    /** Table label (dine-in) or pager number (takeaway). */
    whereLabel: string | null;
    businessDate: string;
    createdAt: string;
    total: string;
    due: string | null;
  };
  stepper: {
    mode: StepperMode;
    steps: { key: StepKey; label: string; state: StepState }[];
    note: string | null;
  };
  info: DetailsRow[];
  items: { groups: (SeatGroup<DetailsItemRow> & { title: string | null })[]; count: number };
  totals: {
    rows: (DetailsRow & { strong?: boolean })[];
    /** Order currency view of the total, only when a display currency is frozen on the order. */
    baseTotal: DetailsRow | null;
    rate: DetailsRow | null;
  };
  payments: DetailsPaymentRow[];
  timeline: { loaded: boolean; error: boolean; rows: DetailsTimelineRow[] };
  timestamps: DetailsRow[];
};

export type BuildOrderDetailsInput = {
  order: OrderDetail;
  /** `undefined` while not fetched yet (POS loads it lazily). */
  events: OrderEvent[] | undefined;
  eventsError?: boolean;
  t: TFunction;
  uiLocale: string;
  intlLocale: string;
  contentLocale: string;
  defaultLocale: string;
  formatMinor: MoneyFormatter;
  tableLabel: string | null;
  /** Order version row is only for the dashboard page. */
  showVersion: boolean;
  now?: Date;
  voidAction?: {
    label: string;
    canVoid: (item: OrderDetail['items'][number]) => boolean;
    onVoid: (itemId: string) => void;
  };
};

function nonEmpty(value: string | null | undefined): value is string {
  return value !== null && value !== undefined && value.trim().length > 0;
}

/** Product names are snapshots: prefer the UI language, then the org default, then any language. */
function snapshotName(
  snapshot: Record<string, string>,
  locale: string,
  defaultLocale: string,
): string {
  const picked = pickLocalizedText(snapshot, locale, defaultLocale);
  if (picked.trim().length > 0) {
    return picked;
  }
  return Object.values(snapshot).find((value) => value.trim().length > 0) ?? '';
}

/** Turns an order (and optionally its events) into plain, already-translated view data. */
export function buildOrderDetailsModel(input: BuildOrderDetailsInput): OrderDetailsModel {
  const { order, t, formatMinor } = input;
  const now = input.now ?? new Date();
  const dateTime = new Intl.DateTimeFormat(input.intlLocale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const timeOnly = new Intl.DateTimeFormat(input.intlLocale, { timeStyle: 'short' });
  const fmt = (iso: string) => dateTime.format(new Date(iso));
  const statusText = (status: string) => t(`orderDetails.status.${status}`, { defaultValue: status });

  const isDineIn = order.type === 'dine_in';
  const whereLabel = isDineIn
    ? input.tableLabel
    : order.pagerNumber !== null
      ? t('orderDetails.pager', { number: order.pagerNumber })
      : null;

  const itemRows: DetailsItemRow[] = order.items.map((item) => {
    const voided = item.status === 'voided';
    const voidParts = [
      item.voidReason,
      item.voidedAt ? timeOnly.format(new Date(item.voidedAt)) : null,
    ].filter(nonEmpty);
    return {
      id: item.id,
      quantity: item.quantity,
      name: snapshotName(item.productNameSnapshot, input.contentLocale, input.defaultLocale),
      modifiers: item.modifiers.map((m) => ({
        id: m.id,
        name: snapshotName(m.nameSnapshot, input.contentLocale, input.defaultLocale),
        delta: m.priceDeltaMinor !== 0 ? formatMinor(m.priceDeltaMinor, 'item') : null,
      })),
      note: nonEmpty(item.notes) ? item.notes : null,
      unitPrice: formatMinor(item.unitPriceMinor, 'item'),
      lineTotal: formatMinor(item.lineTotalMinor, 'item'),
      statusLabel: t(`orderDetails.itemStatus.${item.status}`),
      statusVariant: detailItemStatusVariant(item.status),
      isAddition: item.isAddition,
      voided,
      voidNote: voided && voidParts.length > 0 ? voidParts.join(' · ') : null,
      onVoid:
        input.voidAction && input.voidAction.canVoid(item)
          ? () => {
              input.voidAction?.onVoid(item.id);
            }
          : undefined,
    };
  });
  const seatById = new Map(order.items.map((item) => [item.id, item.seat]));
  const groups = groupItemsBySeat(
    itemRows.map((row) => ({ ...row, seat: seatById.get(row.id) ?? null })),
  ).map((group) => ({
    ...group,
    title: group.seat !== null ? t('orderDetails.seat', { seat: group.seat }) : group.key === 'unseated' ? t('orderDetails.noSeat') : null,
  }));

  const info: DetailsRow[] = [
    { key: 'type', label: t('orderDetails.info.type'), value: t(`orderDetails.type.${order.type}`) },
    ...(isDineIn && nonEmpty(input.tableLabel)
      ? [{ key: 'table', label: t('orderDetails.info.table'), value: input.tableLabel }]
      : []),
    ...(order.pagerNumber !== null
      ? [{ key: 'pager', label: t('orderDetails.info.pager'), value: String(order.pagerNumber) }]
      : []),
    ...(nonEmpty(order.customerName)
      ? [{ key: 'customer', label: t('orderDetails.info.customer'), value: order.customerName }]
      : []),
    ...(nonEmpty(order.notes)
      ? [{ key: 'notes', label: t('orderDetails.info.notes'), value: order.notes }]
      : []),
    { key: 'currency', label: t('orderDetails.info.currency'), value: order.currency },
    ...(input.showVersion
      ? [{ key: 'version', label: t('orderDetails.info.version'), value: `v${String(order.version)}` }]
      : []),
  ];

  const sortedEvents = input.events ? sortEventsChronological(input.events) : [];
  const firstActor = sortedEvents[0]?.actorName ?? null;
  if (nonEmpty(firstActor)) {
    info.push({ key: 'createdBy', label: t('orderDetails.info.createdBy'), value: firstActor });
  }

  const hasDiscount = order.discountMinor > 0;
  const rows: OrderDetailsModel['totals']['rows'] = [
    { key: 'subtotal', label: t('orderDetails.totals.subtotal'), value: formatMinor(order.subtotalMinor, 'item') },
    ...(hasDiscount
      ? [{ key: 'discount', label: t('orderDetails.totals.discount'), value: `−${formatMinor(order.discountMinor, 'item')}` }]
      : []),
    { key: 'tax', label: t('orderDetails.totals.tax'), value: formatMinor(order.taxMinor, 'item') },
    { key: 'total', label: t('orderDetails.totals.total'), value: formatMinor(order.totalMinor, 'total'), strong: true },
    { key: 'paid', label: t('orderDetails.totals.paid'), value: formatMinor(order.paidMinor, 'total') },
    { key: 'due', label: t('orderDetails.totals.due'), value: formatMinor(order.dueMinor, 'total'), strong: order.dueMinor > 0 },
  ];
  const rate = exchangeRateLabel(order.currency, order.display, input.intlLocale);

  const timelineRows: DetailsTimelineRow[] = sortedEvents.map((event) => {
    const row = mapOrderEventToTimelineRow(event);
    return {
      id: row.id,
      icon: row.icon,
      label: t(row.labelKey, {
        ...row.labelParams,
        from: statusText(String(row.labelParams['from'] ?? '')),
        to: statusText(String(row.labelParams['to'] ?? '')),
        method: row.labelParams['method']
          ? t(`orderDetails.method.${String(row.labelParams['method'])}`)
          : '',
        amountMinor:
          typeof row.labelParams['amountMinor'] === 'number'
            ? formatMinor(row.labelParams['amountMinor'], 'total')
            : '',
      }),
      reason: row.reason,
      actor: row.actorName,
      approver: row.approverName,
      relative: relativeTimeLabel(row.timeIso, now, input.intlLocale),
      absolute: fmt(row.timeIso),
      iso: row.timeIso,
    };
  });

  const timestamps: DetailsRow[] = [
    { key: 'created', label: t('orderDetails.timestamps.created'), value: fmt(order.createdAt) },
    ...(order.placedAt ? [{ key: 'placed', label: t('orderDetails.timestamps.placed'), value: fmt(order.placedAt) }] : []),
    ...(order.completedAt ? [{ key: 'completed', label: t('orderDetails.timestamps.completed'), value: fmt(order.completedAt) }] : []),
    ...(order.cancelledAt ? [{ key: 'cancelled', label: t('orderDetails.timestamps.cancelled'), value: fmt(order.cancelledAt) }] : []),
  ];

  const stepper = orderStepper(order.status);
  const stepperNote =
    stepper.mode === 'draft'
      ? t('orderDetails.stepper.awaitingPayment')
      : stepper.mode === 'cancelled'
        ? nonEmpty(order.cancelReason)
          ? t('orderDetails.stepper.cancelledWithReason', { reason: order.cancelReason })
          : t('orderDetails.stepper.cancelled')
        : null;

  return {
    header: {
      number: String(order.orderNumber),
      status: order.status,
      statusLabel: statusText(order.status),
      statusVariant: detailStatusVariant(order.status),
      paymentLabel: t(`orderDetails.paymentStatus.${order.paymentStatus}`),
      paymentVariant: detailPaymentVariant(order.paymentStatus),
      typeLabel: t(`orderDetails.type.${order.type}`),
      whereLabel: nonEmpty(whereLabel) ? whereLabel : null,
      businessDate: order.businessDate,
      createdAt: fmt(order.createdAt),
      total: formatMinor(order.totalMinor, 'total'),
      due: order.dueMinor > 0 ? formatMinor(order.dueMinor, 'total') : null,
    },
    stepper: {
      mode: stepper.mode,
      steps: stepper.steps.map((step) => ({
        ...step,
        label: t(`orderDetails.status.${step.key}`),
      })),
      note: stepperNote,
    },
    info,
    items: { groups, count: order.items.length },
    totals: {
      rows,
      baseTotal:
        rate !== null
          ? {
              key: 'baseTotal',
              label: t('orderDetails.totals.inCurrency', { currency: order.currency }),
              value: formatMoney(order.totalMinor, order.currency, input.uiLocale),
            }
          : null,
      rate: rate !== null ? { key: 'rate', label: t('orderDetails.totals.rate'), value: rate } : null,
    },
    payments: order.payments.map((payment) => {
      const cash = paymentCashLabels(payment, order, input.uiLocale);
      return {
        id: payment.id,
        method: t(`orderDetails.method.${payment.method}`),
        amount: formatMinor(payment.amountMinor, 'total'),
        tendered: cash.tendered,
        change: cash.change,
        time: fmt(payment.createdAt),
      };
    }),
    timeline: {
      loaded: input.events !== undefined,
      error: input.eventsError === true,
      rows: timelineRows,
    },
    timestamps,
  };
}
