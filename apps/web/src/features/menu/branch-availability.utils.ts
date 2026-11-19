/**
 * Branch availability of a product or category, as the menu forms edit it.
 *
 * Staff with access to every branch pick "All branches" or a list. Staff limited to a few branches
 * only ever see their own branches as checkboxes: the API keeps the other branches as they are.
 */

export interface BranchAvailabilityValues {
  availableInAllBranches: boolean;
  branchIds: string[];
}

export interface BranchAvailabilityScope {
  /** Member can work in every branch (and may use "All branches"). */
  allBranchesScope: boolean;
  /** Branches the member can pick from (their active branches). */
  ownBranchIds: string[];
}

export interface BranchAvailabilitySource {
  availableInAllBranches: boolean;
  branchIds: string[];
}

export function branchAvailabilityDefaults(
  source: BranchAvailabilitySource | undefined,
  scope: BranchAvailabilityScope,
): BranchAvailabilityValues {
  if (scope.allBranchesScope) {
    return source
      ? {
          availableInAllBranches: source.availableInAllBranches,
          branchIds: [...source.branchIds],
        }
      : { availableInAllBranches: true, branchIds: [] };
  }
  const own = new Set(scope.ownBranchIds);
  if (!source || source.availableInAllBranches) {
    return { availableInAllBranches: false, branchIds: [...scope.ownBranchIds] };
  }
  return {
    availableInAllBranches: false,
    branchIds: source.branchIds.filter((id) => own.has(id)),
  };
}

export function branchAvailabilityToApi(
  values: BranchAvailabilityValues,
  scope: BranchAvailabilityScope,
): { availableInAllBranches: true } | { availableInAllBranches: false; branchIds: string[] } {
  if (scope.allBranchesScope && values.availableInAllBranches) {
    return { availableInAllBranches: true };
  }
  return { availableInAllBranches: false, branchIds: values.branchIds };
}

/** The field only matters when there is something to choose. */
export function showBranchAvailability(scope: BranchAvailabilityScope): boolean {
  return scope.allBranchesScope ? scope.ownBranchIds.length > 1 : scope.ownBranchIds.length > 0;
}

export function toggleBranchId(current: string[], branchId: string, checked: boolean): string[] {
  if (checked) {
    return current.includes(branchId) ? current : [...current, branchId];
  }
  return current.filter((id) => id !== branchId);
}

/** Branch filter value for the product list ("all" means no filter). */
export const ALL_BRANCHES_FILTER = 'all';
