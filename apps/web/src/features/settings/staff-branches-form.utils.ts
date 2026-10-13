export type BranchScopeForm = {
  allBranches: boolean;
  branchIds: string[];
};

export type ValidateBranchScopeResult =
  | { ok: true; allBranches: boolean; branchIds: string[] }
  | { ok: false; reason: 'no_branch_selected' };

export function validateBranchScope(form: BranchScopeForm): ValidateBranchScopeResult {
  if (form.allBranches) {
    return { ok: true, allBranches: true, branchIds: [] };
  }
  if (form.branchIds.length === 0) {
    return { ok: false, reason: 'no_branch_selected' };
  }
  return { ok: true, allBranches: false, branchIds: form.branchIds };
}
