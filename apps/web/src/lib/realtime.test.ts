import { describe, expect, it, vi } from 'vitest';

import { createRealtimeClient, type RealtimeClientOptions } from './realtime.js';

type Handler = (...args: unknown[]) => void;

function fakeSocket() {
  const handlers = new Map<string, Handler[]>();
  const socket = {
    active: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
    on: (name: string, fn: Handler) => {
      handlers.set(name, [...(handlers.get(name) ?? []), fn]);
      return socket;
    },
    emit: (name: string, ...args: unknown[]) => {
      for (const fn of handlers.get(name) ?? []) {
        fn(...args);
      }
    },
  };
  return socket;
}

function setup(over: Partial<RealtimeClientOptions> = {}) {
  const socket = fakeSocket();
  const opts = {
    baseUrl: 'http://api',
    getAuth: () => ({ token: 't', branchId: 'b' }),
    refreshToken: vi.fn(() => Promise.resolve<string | null>('t2')),
    onState: vi.fn(),
    onEvent: vi.fn(),
    onResync: vi.fn(),
    ...over,
  };
  const client = createRealtimeClient({
    ...opts,
    socketFactory: () =>
      socket as unknown as ReturnType<NonNullable<RealtimeClientOptions['socketFactory']>>,
  });
  return { socket, opts, client };
}

const payload = {
  orderId: '00000000-0000-4000-8000-000000000001',
  branchId: '00000000-0000-4000-8000-000000000002',
  status: 'placed',
  version: 1,
  change: 'placed',
};

describe('createRealtimeClient', () => {
  it('resyncs on every connect after the first', () => {
    const { socket, opts } = setup();
    socket.emit('connect');
    expect(opts.onResync).not.toHaveBeenCalled();
    socket.emit('disconnect', 'transport close');
    expect(opts.onState).toHaveBeenLastCalledWith('offline');
    socket.emit('connect');
    expect(opts.onResync).toHaveBeenCalledTimes(1);
    expect(opts.onState).toHaveBeenLastCalledWith('online');
  });

  it('passes valid events and drops malformed ones', () => {
    const { socket, opts } = setup();
    socket.emit('order.placed', payload);
    socket.emit('order.updated', { orderId: 'nope' });
    expect(opts.onEvent).toHaveBeenCalledTimes(1);
    expect(opts.onEvent).toHaveBeenCalledWith({ name: 'order.placed', payload });
  });

  it('refreshes the token once on UNAUTHORIZED and reconnects', async () => {
    const { socket, opts } = setup();
    socket.active = false;
    socket.emit('connect_error', new Error('UNAUTHORIZED'));
    socket.emit('connect_error', new Error('UNAUTHORIZED'));
    await Promise.resolve();
    await Promise.resolve();
    expect(opts.refreshToken).toHaveBeenCalledTimes(1);
    expect(socket.connect).toHaveBeenCalledTimes(1);
  });

  it('does not retry FORBIDDEN or after close', async () => {
    const { socket, opts, client } = setup();
    socket.active = false;
    socket.emit('connect_error', new Error('FORBIDDEN'));
    client.close();
    socket.emit('connect_error', new Error('UNAUTHORIZED'));
    await Promise.resolve();
    expect(opts.refreshToken).not.toHaveBeenCalled();
    expect(socket.disconnect).toHaveBeenCalled();
  });
});
