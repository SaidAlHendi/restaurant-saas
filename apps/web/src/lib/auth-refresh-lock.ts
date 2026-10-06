import { refreshMutex } from './refresh-mutex.js';

const LOCK_NAME = 'auth-refresh';

/**
 * Single-flight refresh across tabs (navigator.locks) and in-tab callers (mutex).
 * Access token stays in Redux only; the refresh cookie is shared across tabs.
 */
export async function runAuthRefresh(fetchRefresh: () => Promise<string | null>): Promise<string | null> {
  const exec = (): Promise<string | null> => fetchRefresh();

  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return navigator.locks.request(LOCK_NAME, exec);
  }
  return refreshMutex.run(exec);
}
