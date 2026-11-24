import { useCallback } from 'react';

import type { DataChangedPayload } from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';
import { useAppDispatch, useAppSelector } from '../../app/hooks.js';
import { refreshSessionFromMe } from '../session/refresh-session-from-me.js';
import { selectCurrentBranchId } from '../session/session.selectors.js';
import { CATALOG_TAGS, SCOPE_TAGS, SESSION_SCOPES } from './app-live-sync.utils.js';
import { useBranchRealtime } from './use-branch-realtime.js';

/**
 * Keeps every signed-in screen current without polling: the server pushes `data.changed` (settings,
 * tables, staff, devices, branch, plan) and `catalog.updated`; this refetches only the matching data.
 */
export function useAppLiveSync(): void {
  const dispatch = useAppDispatch();
  const branchId = useAppSelector(selectCurrentBranchId);

  const refetchAll = useCallback(() => {
    dispatch(baseApi.util.invalidateTags([...new Set(Object.values(SCOPE_TAGS).flat())]));
    dispatch(baseApi.util.invalidateTags([...CATALOG_TAGS]));
    void refreshSessionFromMe(dispatch);
  }, [dispatch]);

  const onDataChanged = useCallback(
    (payload: DataChangedPayload) => {
      dispatch(baseApi.util.invalidateTags([...SCOPE_TAGS[payload.scope]]));
      if (SESSION_SCOPES.includes(payload.scope)) {
        void refreshSessionFromMe(dispatch);
      }
    },
    [dispatch],
  );

  useBranchRealtime({
    branchId,
    onEvent: () => undefined,
    onResync: refetchAll,
    onCatalogUpdated: () => {
      dispatch(baseApi.util.invalidateTags([...CATALOG_TAGS]));
    },
    onDataChanged,
  });
}
