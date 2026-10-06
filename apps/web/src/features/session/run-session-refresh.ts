import type { AppDispatch } from '../../app/store.js';
import { authApi } from '../auth/auth.api.js';
import { runAuthRefresh } from '../../lib/auth-refresh-lock.js';
import { setAccessToken } from './session.slice.js';

export async function runSessionRefresh(dispatch: AppDispatch): Promise<string | null> {
  return runAuthRefresh(async () => {
    try {
      const refreshed = await dispatch(authApi.endpoints.refresh.initiate(undefined)).unwrap();
      dispatch(setAccessToken(refreshed.accessToken));
      return refreshed.accessToken;
    } catch {
      return null;
    }
  });
}
