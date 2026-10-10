import {
  backoffSecondsAfterFailure,
  computeNextAttemptAt,
  MAX_OUTBOX_ATTEMPTS,
  shouldMarkOutboxDead,
} from './outbox-backoff';

describe('outbox-backoff', () => {
  it('caps exponential backoff at five minutes', () => {
    expect(backoffSecondsAfterFailure(1)).toBe(2);
    expect(backoffSecondsAfterFailure(10)).toBe(300);
    expect(backoffSecondsAfterFailure(20)).toBe(300);
  });

  it('computes next_attempt_at from attempts after failure', () => {
    const now = new Date('2026-06-01T12:00:00.000Z');
    const next = computeNextAttemptAt(now, 3);
    expect(next.toISOString()).toBe('2026-06-01T12:00:08.000Z');
  });

  it('marks dead without branch or after max attempts', () => {
    expect(shouldMarkOutboxDead(1, null)).toBe(true);
    expect(shouldMarkOutboxDead(MAX_OUTBOX_ATTEMPTS - 1, '00000000-0000-4000-8000-000000000001')).toBe(
      false,
    );
    expect(shouldMarkOutboxDead(MAX_OUTBOX_ATTEMPTS, '00000000-0000-4000-8000-000000000001')).toBe(true);
  });
});
