import { useMemo } from 'react';

import { useAppSelector } from '../../../app/hooks.js';
import {
  selectAllBranchesScope,
  selectSessionBranches,
} from '../../session/session.selectors.js';
import type { BranchAvailabilityScope } from '../branch-availability.utils.js';

/** Which branches the current member can pick from when choosing where an item is shown. */
export function useBranchAvailabilityScope(): BranchAvailabilityScope & {
  branches: { id: string; name: string }[];
} {
  const sessionBranches = useAppSelector(selectSessionBranches);
  const allBranchesScope = useAppSelector(selectAllBranchesScope);
  return useMemo(() => {
    const branches = sessionBranches
      .filter((branch) => branch.isActive)
      .map((branch) => ({ id: branch.id, name: branch.name }));
    return {
      allBranchesScope,
      ownBranchIds: branches.map((branch) => branch.id),
      branches,
    };
  }, [allBranchesScope, sessionBranches]);
}
