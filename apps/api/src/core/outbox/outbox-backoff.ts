export const MAX_OUTBOX_ATTEMPTS = 10;
const MAX_BACKOFF_SECONDS = 300;

/** Backoff after failure when `attempts` has already been incremented. */
export function backoffSecondsAfterFailure(attemptsAfterFailure: number): number {
  const exponent = Math.max(0, attemptsAfterFailure);
  const seconds = 2 ** exponent;
  return Math.min(seconds, MAX_BACKOFF_SECONDS);
}

export function computeNextAttemptAt(now: Date, attemptsAfterFailure: number): Date {
  const delayMs = backoffSecondsAfterFailure(attemptsAfterFailure) * 1000;
  return new Date(now.getTime() + delayMs);
}

export function shouldMarkOutboxDead(attemptsAfterFailure: number, branchId: string | null): boolean {
  if (!branchId) {
    return true;
  }
  return attemptsAfterFailure >= MAX_OUTBOX_ATTEMPTS;
}
