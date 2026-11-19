import type { AppDispatch } from '../../app/store.js';
import { authApi } from '../auth/auth.api.js';
import { hydrateFromMe } from './session.slice.js';

/**
 * Re-reads /v1/me and updates the session slice, so things built from it (the header
 * branch switcher, permissions) pick up changes such as a renamed or newly added branch.
 */
export async function refreshSessionFromMe(dispatch: AppDispatch): Promise<void> {
  try {
    const me = await dispatch(
      authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true }),
    ).unwrap();
    dispatch(hydrateFromMe(me));
  } catch {
    // Keep the current session; the next bootstrap or refresh will resync.
  }
}
