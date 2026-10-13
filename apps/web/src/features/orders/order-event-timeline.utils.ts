import type { OrderEvent, OrderStatus } from '@app/shared';

export type OrderTimelineRow = {
  id: string;
  icon: 'status' | 'items' | 'payment' | 'cancel' | 'default';
  labelKey: string;
  labelParams: Record<string, string | number>;
  actorName: string | null;
  approverName: string | null;
  timeIso: string;
};

function readString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === 'string' ? value : undefined;
}

function readNumber(payload: Record<string, unknown>, key: string): number | undefined {
  const value = payload[key];
  return typeof value === 'number' ? value : undefined;
}

function readItemCount(payload: Record<string, unknown>): number {
  const itemIds = payload['itemIds'];
  if (Array.isArray(itemIds)) {
    return itemIds.length;
  }
  const count = readNumber(payload, 'itemCount');
  return count ?? 0;
}

export function mapOrderEventToTimelineRow(event: OrderEvent): OrderTimelineRow {
  const payload = event.payload;
  switch (event.type) {
    case 'order.drafted':
      return {
        id: event.id,
        icon: 'status',
        labelKey: 'order.events.drafted',
        labelParams: {},
        actorName: event.actorName,
        approverName: event.approverName,
        timeIso: event.createdAt,
      };
    case 'order.placed':
      return {
        id: event.id,
        icon: 'status',
        labelKey: 'order.events.placed',
        labelParams: {},
        actorName: event.actorName,
        approverName: event.approverName,
        timeIso: event.createdAt,
      };
    case 'order.status_changed': {
      const from = event.fromStatus ?? ('unknown' as OrderStatus);
      const to = event.toStatus ?? ('unknown' as OrderStatus);
      return {
        id: event.id,
        icon: 'status',
        labelKey: 'order.events.statusChanged',
        labelParams: { from, to },
        actorName: event.actorName,
        approverName: event.approverName,
        timeIso: event.createdAt,
      };
    }
    case 'order.items_added':
      return {
        id: event.id,
        icon: 'items',
        labelKey: 'order.events.itemsAdded',
        labelParams: { count: readItemCount(payload) },
        actorName: event.actorName,
        approverName: event.approverName,
        timeIso: event.createdAt,
      };
    case 'order.item_voided':
      return {
        id: event.id,
        icon: 'items',
        labelKey: 'order.events.itemVoided',
        labelParams: {
          name: readString(payload, 'itemName') ?? readString(payload, 'productName') ?? '',
          reason: readString(payload, 'reason') ?? '',
        },
        actorName: event.actorName,
        approverName: event.approverName,
        timeIso: event.createdAt,
      };
    case 'order.item_status_changed':
      return {
        id: event.id,
        icon: 'items',
        labelKey: 'order.events.itemStatusChanged',
        labelParams: {
          name: readString(payload, 'itemName') ?? '',
          status: readString(payload, 'status') ?? '',
        },
        actorName: event.actorName,
        approverName: event.approverName,
        timeIso: event.createdAt,
      };
    case 'order.cancelled':
      return {
        id: event.id,
        icon: 'cancel',
        labelKey: 'order.events.cancelled',
        labelParams: { reason: readString(payload, 'reason') ?? '' },
        actorName: event.actorName,
        approverName: event.approverName,
        timeIso: event.createdAt,
      };
    case 'payment.captured':
      return {
        id: event.id,
        icon: 'payment',
        labelKey: 'order.events.paymentCaptured',
        labelParams: {
          method: readString(payload, 'method') ?? '',
          amountMinor: readNumber(payload, 'amountMinor') ?? 0,
        },
        actorName: event.actorName,
        approverName: event.approverName,
        timeIso: event.createdAt,
      };
    default:
      return {
        id: event.id,
        icon: 'default',
        labelKey: 'order.events.unknown',
        labelParams: { type: event.type },
        actorName: event.actorName,
        approverName: event.approverName,
        timeIso: event.createdAt,
      };
  }
}

export function sortEventsChronological(events: OrderEvent[]): OrderEvent[] {
  return [...events].sort((a, b) => {
    const byTime = a.createdAt.localeCompare(b.createdAt);
    if (byTime !== 0) {
      return byTime;
    }
    return a.id.localeCompare(b.id);
  });
}
