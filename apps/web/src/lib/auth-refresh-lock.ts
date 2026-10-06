import { refreshMutex } from './refresh-mutex.js';

const LOCK_NAME = 'auth-refresh';
const STORAGE_KEY = '@app/auth/refresh-access-token';

type CachedRefresh = {
  accessToken: string;
  at: number;
};

function readCachedRefresh(maxAgeMs: number): string | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as CachedRefresh;
    if (typeof parsed.accessToken !== 'string' || typeof parsed.at !== 'number') {
      return null;
    }
    if (Date.now() - parsed.at > maxAgeMs) {
      return null;
    }
    return parsed.accessToken;
  } catch {
    return null;
  }
}

function writeCachedRefresh(accessToken: string): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  const payload: CachedRefresh = { accessToken, at: Date.now() };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

/**
 * Single-flight refresh across tabs (navigator.locks) and in-tab callers (mutex).
 * After the lock, reuses a token another tab may have just written.
 */
export async function runAuthRefresh(fetchRefresh: () => Promise<string | null>): Promise<string | null> {
  const exec = async (): Promise<string | null> => {
    const cached = readCachedRefresh(30_000);
    if (cached) {
      return cached;
    }
    const token = await fetchRefresh();
    if (token) {
      writeCachedRefresh(token);
    }
    return token;
  };

  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return navigator.locks.request(LOCK_NAME, exec);
  }
  return refreshMutex.run(exec);
}
