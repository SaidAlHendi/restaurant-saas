import { useEffect } from 'react';

import { useAppDispatch } from '../../app/hooks.js';
import { authApi } from '../auth/auth.api.js';
import { clearSession, hydrateFromMe, setBootstrapDone } from './session.slice.js';
import { runSessionRefresh } from './run-session-refresh.js';

/** Restores the session once on app start: refresh cookie → access token → /v1/me. */
export function useSessionBootstrap() {
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
}
