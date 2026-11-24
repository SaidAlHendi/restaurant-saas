import { createRequire } from 'node:module';
import { config } from './config.mjs';

// socket.io-client is already a devDependency of apps/api, so the script itself needs no install of its own.
let ioFactory = null;
try {
  const req = createRequire(new URL('../../../apps/api/package.json', import.meta.url));
  ioFactory = req('socket.io-client').io;
} catch { /* realtime tests will be skipped */ }

export const socketsAvailable = () => ioFactory !== null;

/** A connected /rt socket that records every event it receives. */
export function openSocket(token, branchId) {
  return new Promise((resolve, reject) => {
    const socket = ioFactory(`${config.apiUrl}/rt`, {
      transports: ['websocket'], auth: { token, branchId }, reconnection: false, timeout: 5000,
    });
    const events = [];
    let disconnected = false;
    const waiters = [];
    const h = {
      events,
      get connected() { return socket.connected; },
      get disconnected() { return disconnected; },
      close: () => socket.close(),
      /** Resolves with the first matching event (already received or yet to come), rejects on timeout. */
      waitFor(type, pred = () => true, ms = 5000, since = 0) {
        const hit = events.slice(since).find((e) => e.type === type && pred(e.payload));
        if (hit) return Promise.resolve(hit);
        return new Promise((res, rej) => {
          const w = { type, pred, res, since };
          waiters.push(w);
          setTimeout(() => { waiters.splice(waiters.indexOf(w), 1); rej(new Error(`no "${type}" event within ${ms} ms (got: ${events.map((e) => e.type).join(', ') || 'nothing'})`)); }, ms);
        });
      },
      waitDisconnect(ms = 5000) {
        if (disconnected) return Promise.resolve();
        return new Promise((res, rej) => {
          const t0 = setTimeout(() => rej(new Error(`socket still connected after ${ms} ms`)), ms);
          socket.once('disconnect', () => { clearTimeout(t0); res(); });
        });
      },
    };
    socket.onAny((type, payload) => {
      const e = { type, payload, at: Date.now() };
      events.push(e);
      for (const w of [...waiters]) if (w.type === type && w.pred(payload) && events.length > w.since) { waiters.splice(waiters.indexOf(w), 1); w.res(e); }
    });
    socket.on('disconnect', () => { disconnected = true; });
    socket.on('connect', () => resolve(h));
    socket.on('connect_error', (err) => reject(new Error(`socket connect failed: ${err.message}`)));
  });
}

/** Poll `fn` until it returns truthy; resolves with elapsed ms, rejects after `maxMs`. */
export async function until(fn, { maxMs = 3000, stepMs = 150 } = {}) {
  const start = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return Date.now() - start;
    if (Date.now() - start > maxMs) throw new Error('condition not met');
    await new Promise((r) => setTimeout(r, stepMs));
  }
}
