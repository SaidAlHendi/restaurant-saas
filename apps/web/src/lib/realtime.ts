import { io, type ManagerOptions, type Socket, type SocketOptions } from 'socket.io-client';

import { orderRealtimeClientPayloadSchema, type OrderRealtimeClientPayload } from '@app/shared';

/** Socket events the server emits on namespace /rt (docs/api-conventions.md). */
export const REALTIME_EVENT_NAMES = [
  'order.placed',
  'order.updated',
  'order.item_updated',
] as const;
export type RealtimeEventName = (typeof REALTIME_EVENT_NAMES)[number];

export type RealtimeState = 'connecting' | 'online' | 'offline';

export type RealtimeEvent = {
  name: RealtimeEventName;
  payload: OrderRealtimeClientPayload;
};

export type RealtimeAuth = { token: string | null; branchId: string };

type SocketFactory = (url: string, options: Partial<ManagerOptions & SocketOptions>) => Socket;

export type RealtimeClientOptions = {
  /** API origin, e.g. http://localhost:3000 (namespace is appended). */
  baseUrl: string;
  /** Read on every (re)connect so a refreshed token is used. */
  getAuth: () => RealtimeAuth;
  /** Refresh the access token; resolves to the new token or null. */
  refreshToken: () => Promise<string | null>;
  onState: (state: RealtimeState) => void;
  onEvent: (event: RealtimeEvent) => void;
  /** Called on every connect after the first: the screen must refetch (events may be missed). */
  onResync: () => void;
  socketFactory?: SocketFactory;
};

export type RealtimeClient = { close: () => void };

/**
 * One socket per screen. Events are hints only (architecture.md "Realtime"): the screen refetches
 * on reconnect and ignores events whose version it already has.
 */
export function createRealtimeClient(options: RealtimeClientOptions): RealtimeClient {
  const factory: SocketFactory = options.socketFactory ?? ((url, opts) => io(url, opts));
  const socket = factory(`${options.baseUrl}/rt`, {
    transports: ['websocket'],
    auth: (cb) => {
      cb(options.getAuth());
    },
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 15_000,
  });

  let hasConnected = false;
  let refreshing = false;
  let closed = false;

  options.onState('connecting');

  socket.on('connect', () => {
    if (hasConnected) {
      options.onResync();
    }
    hasConnected = true;
    options.onState('online');
  });

  socket.on('disconnect', (reason) => {
    options.onState('offline');
    if (reason === 'io server disconnect' && !closed) {
      socket.connect();
    }
  });

  socket.on('connect_error', (err: Error) => {
    options.onState('offline');
    // Middleware errors are not retried by socket.io (socket.active === false).
    if (socket.active || closed) {
      return;
    }
    if (err.message !== 'UNAUTHORIZED' || refreshing) {
      return;
    }
    refreshing = true;
    void options
      .refreshToken()
      .then((token) => {
        refreshing = false;
        if (token !== null && !closed) {
          socket.connect();
        }
      })
      .catch(() => {
        refreshing = false;
      });
  });

  for (const name of REALTIME_EVENT_NAMES) {
    socket.on(name, (raw: unknown) => {
      const parsed = orderRealtimeClientPayloadSchema.safeParse(raw);
      if (parsed.success) {
        options.onEvent({ name, payload: parsed.data });
      }
    });
  }

  return {
    close: () => {
      closed = true;
      socket.removeAllListeners();
      socket.disconnect();
    },
  };
}
