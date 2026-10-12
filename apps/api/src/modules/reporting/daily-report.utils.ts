import type { DailyReport, OrderType, PaymentMethod } from '@app/shared';
import { PAYMENT_METHODS_SORTED } from '@app/shared';

export const COUNTED_ORDER_STATUSES = ['placed', 'preparing', 'ready', 'completed'] as const;

export const ALL_ORDER_TYPES: readonly OrderType[] = ['dine_in', 'takeaway'];

export function averageTicketMinor(salesMinor: number, ordersCount: number): number {
  if (ordersCount <= 0) {
    return 0;
  }
  return Math.round(salesMinor / ordersCount);
}

export function unpaidMinor(salesMinor: number, paidMinor: number): number {
  const diff = salesMinor - paidMinor;
  return diff > 0 ? diff : 0;
}

export function fillByType(
  rows: Array<{ type: OrderType; ordersCount: number; salesMinor: number }>,
): DailyReport['byType'] {
  const byType = new Map(rows.map((r) => [r.type, r]));
  return ALL_ORDER_TYPES.map((type) => {
    const row = byType.get(type);
    return {
      type,
      ordersCount: row?.ordersCount ?? 0,
      salesMinor: row?.salesMinor ?? 0,
    };
  });
}

export function fillByPaymentMethod(
  rows: Array<{ method: PaymentMethod; paymentsCount: number; amountMinor: number }>,
): DailyReport['byPaymentMethod'] {
  const byMethod = new Map(rows.map((r) => [r.method, r]));
  return PAYMENT_METHODS_SORTED.map((method) => {
    const row = byMethod.get(method);
    return {
      method,
      paymentsCount: row?.paymentsCount ?? 0,
      amountMinor: row?.amountMinor ?? 0,
    };
  });
}

export function sumByPaymentMethodAmount(byPaymentMethod: DailyReport['byPaymentMethod']): number {
  return byPaymentMethod.reduce((sum, row) => sum + row.amountMinor, 0);
}
