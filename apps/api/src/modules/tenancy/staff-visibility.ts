export interface VisibleStaffCandidate {
  isSelf: boolean;
  allBranches: boolean;
  branchIds: string[];
}

/**
 * Keeps members the actor may see: themselves, members with access to all
 * branches, and members who share at least one of the actor's branches.
 */
export function filterStaffByActorBranches<T extends VisibleStaffCandidate>(
  items: T[],
  actorBranchIds: string[],
): T[] {
  const actorBranches = new Set(actorBranchIds);
  return items.filter(
    (item) =>
      item.isSelf || item.allBranches || item.branchIds.some((id) => actorBranches.has(id)),
  );
}
