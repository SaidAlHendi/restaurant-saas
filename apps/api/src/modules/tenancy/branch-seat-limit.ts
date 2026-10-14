export type BranchSeatMembership = {
  id: string;
  status: 'active' | 'invited' | 'disabled';
  allBranches: boolean;
  branchIds: string[];
};

export function countBranchSeats(
  memberships: BranchSeatMembership[],
  branchId: string,
): number {
  let count = 0;
  for (const m of memberships) {
    if (m.status !== 'active' && m.status !== 'invited') {
      continue;
    }
    if (m.allBranches || m.branchIds.includes(branchId)) {
      count += 1;
    }
  }
  return count;
}

export type SeatCheckMode = 'add_one' | 'already_reserved';

export function seatCountViolatesLimit(
  currentCount: number,
  max: number | null,
  mode: SeatCheckMode,
): boolean {
  if (max === null) {
    return false;
  }
  if (mode === 'already_reserved') {
    return currentCount > max;
  }
  return currentCount + 1 > max;
}
