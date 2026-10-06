import { type ReactNode, useEffect } from 'react';

import { useAppDispatch } from '../../app/hooks.js';
import { authApi } from '../auth/auth.api.js';
import {
  clearSession,
  hydrateFromMe,
  setBootstrapDone,
} from './session.slice.js';
import { runSessionRefresh } from './run-session-refresh.js';

export function SessionBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    void (async () => {
      try {
        const token = await runSessionRefresh(dispatch);
        if (!token) {
          dispatch(clearSession());
          return;
        }
        const me = await dispatch(authApi.endpoints.getMe.initiate(undefined)).unwrap();
        dispatch(hydrateFromMe(me));
      } catch {
        dispatch(clearSession());
      } finally {
        dispatch(setBootstrapDone(true));
      }
    })();
  }, [dispatch]);

  return children;
}
