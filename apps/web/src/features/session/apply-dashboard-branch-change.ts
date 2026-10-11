import type { AppDispatch } from '../../app/store.js';
import { baseApi } from '../../app/api/base-api.js';
import { writeStoredBranchId } from './session-branch-preference.js';
import { setCurrentBranchId } from './session.slice.js';

export function applyDashboardBranchChange(
  dispatch: AppDispatch,
  orgId: string,
  branchId: string,
): void {
  dispatch(setCurrentBranchId(branchId));
  writeStoredBranchId(orgId, branchId);
  dispatch(baseApi.util.invalidateTags(['DiningTable']));
}
