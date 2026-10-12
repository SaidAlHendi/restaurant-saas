import type {
  KitchenBoardOrder,
  KitchenBoardResponse,
  OrderRealtimeChange,
  OrderRealtimeClientPayload,
  OrderStatus,
} from '@app/shared';
import { normalizeOrderRealtimeChange } from '@app/shared';

import type { KdsSettings } from './kds-settings.utils.js';

export type AgeLevel = 'normal' | 'amber' | 'red';
export type KdsColumnKey = 'placed' | 'preparing' | 'ready';

export type KdsColumns = Record<KdsColumnKey, KitchenBoardOrder[]>;

const BOARD_STATUSES: readonly OrderStatus[] = ['placed', 'preparing', 'ready'];

export function isBoardStatus(status: OrderStatus): status is KdsColumnKey {
  return BOARD_STATUSES.includes(status);
}

/** Splits board orders into the three columns, oldest first. */
export function splitBoardColumns(orders: readonly KitchenBoardOrder[]): KdsColumns {
  const columns: KdsColumns = { placed: [], preparing: [], ready: [] };
  const sorted = [...orders].sort(
    (a, b) => Date.parse(a.placedAt) - Date.parse(b.placedAt) || a.orderNumber - b.orderNumber,
  );
  for (const order of sorted) {
    if (isBoardStatus(order.status)) {
      columns[order.status].push(order);
    }
  }
  return columns;
}

/** Server clock minus client clock, measured when the board response arrived. */
export function serverClockOffsetMs(serverTime: string, receivedAtMs: number): number {
  const server = Date.parse(serverTime);
  return Number.isNaN(server) ? 0 : server - receivedAtMs;
}

export function orderAgeMs(placedAt: string, nowMs: number, offsetMs: number): number {
  const placed = Date.parse(placedAt);
  if (Number.isNaN(placed)) {
    return 0;
  }
  return Math.max(0, nowMs + offsetMs - placed);
}

export function ageLevelFor(
  ageMs: number,
  settings: Pick<KdsSettings, 'amberMinutes' | 'redMinutes'>,
): AgeLevel {
  const minutes = ageMs / 60_000;
  if (minutes >= settings.redMinutes) {
    return 'red';
  }
  if (minutes >= settings.amberMinutes) {
    return 'amber';
  }
  return 'normal';
}

/** "m:ss" under an hour, "h:mm:ss" after. */
export function formatAge(ageMs: number): string {
  const total = Math.floor(ageMs / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) {
    return `${String(hours)}:${String(minutes).padStart(2, '0')}:${ss}`;
  }
  return `${String(minutes)}:${ss}`;
}

/** The status one tap moves the order to; ready -> completed is the cashier's job. */
export function nextKitchenStatus(status: OrderStatus): 'preparing' | 'ready' | null {
  if (status === 'placed') {
    return 'preparing';
  }
  if (status === 'preparing') {
    return 'ready';
  }
  return null;
}

export function canToggleItems(status: OrderStatus): boolean {
  return status === 'placed' || status === 'preparing';
}

/**
 * Whether a socket event means the board is stale. Events are hints: refetch when the order is
 * new to us or the event is newer than what we have.
 */
export function shouldRefetchForEvent(
  board: KitchenBoardResponse | undefined,
  payload: OrderRealtimeClientPayload,
  branchId: string,
): boolean {
  if (payload.branchId !== branchId) {
    return false;
  }
  const card = board?.orders.find((o) => o.id === payload.orderId);
  if (!card) {
    return isBoardStatus(payload.status);
  }
  return payload.version > card.version;
}

const CHIME_CHANGES: readonly OrderRealtimeChange[] = [
  'placed',
  'items_added',
  'item_voided',
  'cancelled',
];

/**
 * Chime for things the kitchen did not do itself. The KDS only changes order/item status, so
 * status and item_status never chime.
 */
export function shouldChime(
  board: KitchenBoardResponse | undefined,
  payload: OrderRealtimeClientPayload,
): boolean {
  const change = normalizeOrderRealtimeChange(payload);
  if (change === 'placed') {
    return isBoardStatus(payload.status);
  }
  if (!CHIME_CHANGES.includes(change)) {
    return false;
  }
  const card = board?.orders.find((o) => o.id === payload.orderId);
  return card !== undefined;
}

export function withOrderStatus(
  board: KitchenBoardResponse,
  orderId: string,
  status: OrderStatus,
): KitchenBoardResponse {
  return {
    ...board,
    orders: board.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
  };
}

export function withItemReady(
  board: KitchenBoardResponse,
  orderId: string,
  itemId: string,
  ready: boolean,
): KitchenBoardResponse {
  return {
    ...board,
    orders: board.orders.map((o) => {
      if (o.id !== orderId) {
        return o;
      }
      const notReady = o.status === 'preparing' ? 'preparing' : 'pending';
      return {
        ...o,
        items: o.items.map((i) =>
          i.id === itemId ? { ...i, status: ready ? 'ready' : notReady } : i,
        ),
      };
    }),
  };
}

/** Applies a server order (from a mutation response) to the board: version, status and items. */
export function withServerOrder(
  board: KitchenBoardResponse,
  order: {
    id: string;
    status: OrderStatus;
    version: number;
    items: Array<{ id: string; status: KitchenBoardOrder['items'][number]['status'] }>;
  },
): KitchenBoardResponse {
  if (!isBoardStatus(order.status)) {
    return { ...board, orders: board.orders.filter((o) => o.id !== order.id) };
  }
  const statusById = new Map(order.items.map((i) => [i.id, i.status]));
  return {
    ...board,
    orders: board.orders.map((o) =>
      o.id === order.id && order.version >= o.version
        ? {
            ...o,
            status: order.status,
            version: order.version,
            items: o.items.map((i) => ({ ...i, status: statusById.get(i.id) ?? i.status })),
          }
        : o,
    ),
  };
}
