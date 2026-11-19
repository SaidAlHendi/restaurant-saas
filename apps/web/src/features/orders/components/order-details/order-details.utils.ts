import type { MoneyDisplay, OrderItemStatus, OrderStatus, PaymentStatus } from '@app/shared';
import { isDisplayConversionActive } from '@app/shared';

export type DetailsBadgeVariant =
  | 'outline'
  | 'new'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'secondary'
  | 'warning'
  | 'success'
  | 'destructive';

/** Colour for the order status badge: draft muted, placed blue, preparing amber, ready green. */
export function detailStatusVariant(status: OrderStatus): DetailsBadgeVariant {
  switch (status) {
    case 'draft':
      return 'outline';
    case 'placed':
      return 'new';
    case 'preparing':
      return 'preparing';
    case 'ready':
      return 'ready';
    case 'completed':
      return 'completed';
    case 'cancelled':
    case 'refunded':
      return 'cancelled';
  }
}

export function detailPaymentVariant(status: PaymentStatus): DetailsBadgeVariant {
  switch (status) {
    case 'paid':
      return 'ready';
    case 'partial':
      return 'preparing';
    case 'refunded':
      return 'cancelled';
    case 'unpaid':
      return 'outline';
  }
}

export function detailItemStatusVariant(status: OrderItemStatus): DetailsBadgeVariant {
  switch (status) {
    case 'awaiting_payment':
      return 'outline';
    case 'pending':
      return 'new';
    case 'preparing':
      return 'preparing';
    case 'ready':
      return 'ready';
    case 'voided':
      return 'cancelled';
  }
}

export type StepperMode = 'flow' | 'draft' | 'cancelled';
export type StepState = 'done' | 'current' | 'upcoming';
export type StepKey = 'placed' | 'preparing' | 'ready' | 'completed';

export const STEPPER_KEYS: readonly StepKey[] = ['placed', 'preparing', 'ready', 'completed'];

export type StepperModel = {
  mode: StepperMode;
  steps: { key: StepKey; state: StepState }[];
};

/** Which step of Placed → Preparing → Ready → Completed an order is on. */
export function orderStepper(status: OrderStatus): StepperModel {
  const mode: StepperMode =
    status === 'draft' ? 'draft' : status === 'cancelled' ? 'cancelled' : 'flow';
  const currentIndex =
    mode === 'flow'
      ? STEPPER_KEYS.indexOf((status === 'refunded' ? 'completed' : status) as StepKey)
      : -1;
  return {
    mode,
    steps: STEPPER_KEYS.map((key, index) => ({
      key,
      state:
        mode !== 'flow'
          ? 'upcoming'
          : status === 'completed' || status === 'refunded' || index < currentIndex
            ? 'done'
            : index === currentIndex
              ? 'current'
              : 'upcoming',
    })),
  };
}

export type SeatGroup<T> = { key: string; seat: string | null; items: T[] };

/**
 * Groups lines by seat when any line has one (unseated lines go last), otherwise returns one flat
 * group. Order inside a group is kept.
 */
export function groupItemsBySeat<T extends { seat: string | null }>(items: readonly T[]): SeatGroup<T>[] {
  if (!items.some((item) => item.seat !== null && item.seat.trim().length > 0)) {
    return items.length === 0 ? [] : [{ key: 'all', seat: null, items: [...items] }];
  }
  const bySeat = new Map<string, T[]>();
  const unseated: T[] = [];
  for (const item of items) {
    const seat = item.seat?.trim() ?? '';
    if (seat.length === 0) {
      unseated.push(item);
      continue;
    }
    bySeat.set(seat, [...(bySeat.get(seat) ?? []), item]);
  }
  const groups: SeatGroup<T>[] = [...bySeat.entries()].map(([seat, list]) => ({
    key: `seat:${seat}`,
    seat,
    items: list,
  }));
  if (unseated.length > 0) {
    groups.push({ key: 'unseated', seat: null, items: unseated });
  }
  return groups;
}

/** "1 USD = 13,000 SYP" for an order with a frozen display currency; null otherwise. */
export function exchangeRateLabel(
  currency: string,
  display: MoneyDisplay | null,
  intlLocale: string,
): string | null {
  if (!isDisplayConversionActive(currency, display)) {
    return null;
  }
  const rate = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 6 }).format(display.rate);
  return `1 ${currency} = ${rate} ${display.currency}`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "5 minutes ago" in the UI language. Falls back to nothing useful for future/invalid dates. */
export function relativeTimeLabel(iso: string, now: Date, intlLocale: string): string {
  const diff = new Date(iso).getTime() - now.getTime();
  const rtf = new Intl.RelativeTimeFormat(intlLocale, { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < MINUTE) {
    return rtf.format(0, 'second');
  }
  if (abs < HOUR) {
    return rtf.format(Math.round(diff / MINUTE), 'minute');
  }
  if (abs < DAY) {
    return rtf.format(Math.round(diff / HOUR), 'hour');
  }
  return rtf.format(Math.round(diff / DAY), 'day');
}
