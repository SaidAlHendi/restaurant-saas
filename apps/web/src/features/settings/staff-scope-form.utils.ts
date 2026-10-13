import { validateBranchScope, type BranchScopeForm } from './staff-branches-form.utils.js';

export type BranchScopeState = BranchScopeForm;

export function emptyScope(): BranchScopeState {
  return { allBranches: true, branchIds: [] };
}

export function scopePayload(scope: BranchScopeState): {
  allBranches: boolean;
  branchIds: string[];
} | null {
  const validated = validateBranchScope(scope);
  if (!validated.ok) {
    return null;
  }
  return { allBranches: validated.allBranches, branchIds: validated.branchIds };
}

export function toggleBranchInScope(
  scope: BranchScopeState,
  branchId: string,
  checked: boolean,
): BranchScopeState {
  if (checked) {
    return { ...scope, branchIds: [...scope.branchIds, branchId] };
  }
  return { ...scope, branchIds: scope.branchIds.filter((id) => id !== branchId) };
}
