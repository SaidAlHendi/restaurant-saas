import { useCallback, useEffect, useState } from 'react';

export const ACTIVATION_POLL_INTERVAL_MS = 2000;
export const ACTIVATION_POLL_TIMEOUT_MS = 30_000;

export type ActivationPollStatus = 'idle' | 'polling' | 'done' | 'timeout';

type PollState<T> = {
  status: ActivationPollStatus;
  isSettled: ((data: T) => boolean) | null;
  /** Bumped on every start so a second start restarts the 30 s timer. */
  run: number;
};

/**
 * After checkout or a plan change the subscription changes only when Paddle's webhook arrives.
 * Poll (via `pollingInterval`) until `isSettled(data)` is true, or give up after 30 s.
 */
export function useActivationPoll<T>(data: T | undefined) {
  const [state, setState] = useState<PollState<T>>({ status: 'idle', isSettled: null, run: 0 });

  const start = useCallback((isSettled: (data: T) => boolean) => {
    setState((prev) => ({ status: 'polling', isSettled, run: prev.run + 1 }));
  }, []);

  const reset = useCallback(() => {
    setState((prev) => ({ status: 'idle', isSettled: null, run: prev.run }));
  }, []);

  useEffect(() => {
    if (state.status !== 'polling' || state.isSettled === null || data === undefined) {
      return;
    }
    if (state.isSettled(data)) {
      setState((prev) => ({ status: 'done', isSettled: null, run: prev.run }));
    }
  }, [data, state]);

  useEffect(() => {
    if (state.status !== 'polling') {
      return;
    }
    const run = state.run;
    const timer = setTimeout(() => {
      setState((prev) =>
        prev.status === 'polling' && prev.run === run
          ? { status: 'timeout', isSettled: null, run }
          : prev,
      );
    }, ACTIVATION_POLL_TIMEOUT_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [state.status, state.run]);

  return {
    status: state.status,
    start,
    reset,
    pollingInterval: state.status === 'polling' ? ACTIVATION_POLL_INTERVAL_MS : 0,
  };
}
