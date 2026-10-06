import type { PermissionKey } from '@app/shared';

import type { RootState } from '../../app/store.js';

export const selectAccessToken = (state: RootState) => state.session.accessToken;
export const selectBootstrapDone = (state: RootState) => state.session.bootstrapDone;
export const selectSessionUser = (state: RootState) => state.session.user;
export const selectSessionOrg = (state: RootState) => state.session.org;
export const selectSessionBranches = (state: RootState) => state.session.branches;
export const selectSessionOrgs = (state: RootState) => state.session.orgs;
export const selectCurrentBranchId = (state: RootState) => state.session.currentBranchId;
export const selectPermissions = (state: RootState) => state.session.permissions;

export const selectIsAuthenticated = (state: RootState) =>
  state.session.accessToken !== null && state.session.user !== null;

export const selectCan =
  (permission: PermissionKey) =>
  (state: RootState): boolean =>
    state.session.permissions.includes(permission);
