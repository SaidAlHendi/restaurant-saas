import type { DrizzleTx } from '../../core/db/with-org';
import type { EntitlementsService } from '../billing/entitlements.service';

import { countBranchSeats, type SeatCheckMode } from './branch-seat-limit';
import type { TenancyRepository } from './tenancy.repository';

export async function assertUsersPerBranchSeats(
  entitlements: EntitlementsService,
  tenancyRepo: TenancyRepository,
  tx: DrizzleTx,
  orgId: string,
  branchIds: string[],
  mode: SeatCheckMode,
): Promise<void> {
  const uniqueBranches = [...new Set(branchIds)];
  if (uniqueBranches.length === 0) {
    return;
  }
  const memberships = await tenancyRepo.listBranchSeatMemberships(tx);
  for (const branchId of uniqueBranches) {
    const count = countBranchSeats(memberships, branchId);
    const nextValue = mode === 'add_one' ? count + 1 : count;
    await entitlements.assertWithinLimit(orgId, 'limit.users_per_branch', nextValue, tx);
  }
}

export function branchesForNewMember(allBranches: boolean, branchIds: string[], activeBranchIds: string[]): string[] {
  if (allBranches) {
    return activeBranchIds;
  }
  return branchIds;
}

export function branchesAddedByMembershipChange(
  previousAllBranches: boolean,
  previousBranchIds: string[],
  nextAllBranches: boolean,
  nextBranchIds: string[],
  activeBranchIds: string[],
): string[] {
  const prev = new Set(
    previousAllBranches ? activeBranchIds : previousBranchIds,
  );
  const next = nextAllBranches ? activeBranchIds : nextBranchIds;
  return next.filter((id) => !prev.has(id));
}
