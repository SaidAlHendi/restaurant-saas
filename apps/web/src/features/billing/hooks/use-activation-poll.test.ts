import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ACTIVATION_POLL_INTERVAL_MS,
  ACTIVATION_POLL_TIMEOUT_MS,
  useActivationPoll,
} from './use-activation-poll.js';

type Data = { plan: string };

describe('useActivationPoll', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls until the data is settled, then stops', () => {
    const { result, rerender } = renderHook(({ data }: { data: Data }) => useActivationPoll(data), {
      initialProps: { data: { plan: 'trial' } },
    });
    expect(result.current.pollingInterval).toBe(0);

    act(() => {
      result.current.start((d) => d.plan === 'restaurant');
    });
    expect(result.current.status).toBe('polling');
    expect(result.current.pollingInterval).toBe(ACTIVATION_POLL_INTERVAL_MS);

    rerender({ data: { plan: 'trial' } });
    expect(result.current.status).toBe('polling');

    rerender({ data: { plan: 'restaurant' } });
    expect(result.current.status).toBe('done');
    expect(result.current.pollingInterval).toBe(0);
  });

  it('gives up after 30 seconds', () => {
    const { result } = renderHook(() => useActivationPoll<Data>({ plan: 'trial' }));
    act(() => {
      result.current.start((d) => d.plan === 'restaurant');
    });
    act(() => {
      vi.advanceTimersByTime(ACTIVATION_POLL_TIMEOUT_MS - 1);
    });
    expect(result.current.status).toBe('polling');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.status).toBe('timeout');
    expect(result.current.pollingInterval).toBe(0);
  });
});
