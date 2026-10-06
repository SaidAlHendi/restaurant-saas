import { type ReactNode, useEffect } from 'react';

import { useAppDispatch } from '../../app/hooks.js';
import { authApi } from '../auth/auth.api.js';
import {
  clearSession,
  hydrateFromMe,
  setAccessToken,
  setBootstrapDone,
} from './session.slice.js';

export function SessionBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    void (async () => {
      try {
        const refreshed = await dispatch(authApi.endpoints.refresh.initiate(undefined)).unwrap();
        dispatch(setAccessToken(refreshed.accessToken));
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
