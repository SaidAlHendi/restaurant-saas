export function parsePinLockedUntilIso(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null;
  }
  if (!('status' in error)) {
    return null;
  }
  const data = (error as { data?: unknown }).data;
  if (!data || typeof data !== 'object') {
    return null;
  }
  const nested = data as { error?: { details?: { lockedUntil?: unknown } } };
  const lockedUntil = nested.error?.details?.lockedUntil;
  return typeof lockedUntil === 'string' ? lockedUntil : null;
}

/** Returns mm:ss countdown text, or null when lock has expired. */
export function formatPinLockCountdown(lockedUntilIso: string, nowMs: number): string | null {
  const untilMs = Date.parse(lockedUntilIso);
  if (Number.isNaN(untilMs)) {
    return null;
  }
  const diffMs = untilMs - nowMs;
  if (diffMs <= 0) {
    return null;
  }
  const totalSec = Math.ceil(diffMs / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  const secPadded = seconds < 10 ? `0${String(seconds)}` : String(seconds);
  return `${String(minutes)}:${secPadded}`;
}
