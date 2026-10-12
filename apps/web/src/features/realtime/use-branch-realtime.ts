import { useEffect, useRef, useState } from 'react';
import { useStore } from 'react-redux';

import { apiBaseUrl } from '../../app/api/base-api.js';
import { useAppDispatch } from '../../app/hooks.js';
import type { RootState } from '../../app/store.js';
import {
  createRealtimeClient,
  type RealtimeEvent,
  type RealtimeState,
} from '../../lib/realtime.js';
import { runSessionRefresh } from '../session/run-session-refresh.js';
import { selectAccessToken } from '../session/session.selectors.js';

export type UseBranchRealtimeOptions = {
  branchId: string | null;
  onEvent: (event: RealtimeEvent) => void;
  onResync: () => void;
};

export type BranchRealtimeStatus = {
  state: RealtimeState;
  /** Socket online and the browser reports a network. */
  isOnline: boolean;
};

function readNavigatorOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

/** Opens the /rt socket for the current branch; reconnects when the branch changes. */
export function useBranchRealtime({
  branchId,
  onEvent,
  onResync,
}: UseBranchRealtimeOptions): BranchRealtimeStatus {
  const store = useStore<RootState>();
  const dispatch = useAppDispatch();
  const [state, setState] = useState<RealtimeState>('connecting');
  const [navigatorOnline, setNavigatorOnline] = useState(readNavigatorOnline);
  const onEventRef = useRef(onEvent);
  const onResyncRef = useRef(onResync);

  useEffect(() => {
    onEventRef.current = onEvent;
    onResyncRef.current = onResync;
  }, [onEvent, onResync]);

  useEffect(() => {
    const update = () => {
      setNavigatorOnline(readNavigatorOnline());
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    if (!branchId) {
      return undefined;
    }
    const client = createRealtimeClient({
      baseUrl: apiBaseUrl(),
      getAuth: () => ({ token: selectAccessToken(store.getState()), branchId }),
      refreshToken: () => runSessionRefresh(dispatch),
      onState: setState,
      onEvent: (event) => {
        onEventRef.current(event);
      },
      onResync: () => {
        onResyncRef.current();
      },
    });
    return () => {
      client.close();
    };
  }, [branchId, dispatch, store]);

  return { state, isOnline: state === 'online' && navigatorOnline };
}
