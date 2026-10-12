import type { OrderStatus as BadgeStatus } from '@app/ui';
import type { OrderStatus } from '@app/shared';
import { formatMoney } from '@app/shared';

export function orderStatusBadgeTone(status: OrderStatus): BadgeStatus {
  switch (status) {
    case 'preparing':
      return 'preparing';
    case 'ready':
      return 'ready';
    case 'completed':
    case 'refunded':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'new';
  }
}

export function formatOrderMoney(minor: number, currency: string, locale: string): string {
  return formatMoney(minor, currency, locale);
}
