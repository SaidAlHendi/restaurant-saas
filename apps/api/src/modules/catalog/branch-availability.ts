import type { BranchAvailabilityInput } from '@app/shared';

import { ForbiddenError, ValidationError } from '../../core/errors/app-errors';

export type BranchAvailability = {
  availableInAllBranches: boolean;
  /** Explicit branch list; always empty when `availableInAllBranches` is true. */
  branchIds: string[];
};

export type BranchAvailabilityScope = {
  allBranches: boolean;
  branchIds: string[];
};

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}

/**
 * Decides the stored branch availability of a product or category.
 *
 * Full-scope staff set it freely. Scoped staff can only touch their own branches: on create they
 * pick from their branches (default: all of them), and on edit they toggle their own branches while
 * the other branches stay as they are. A scoped user hiding an "all branches" item from one of their
 * branches turns it into an explicit list of every other branch.
 */
export function resolveBranchAvailability(args: {
  scope: BranchAvailabilityScope;
  orgBranchIds: string[];
  input: BranchAvailabilityInput;
  /** null when creating. */
  current: BranchAvailability | null;
}): BranchAvailability {
  const { scope, orgBranchIds, input, current } = args;
  const orgSet = new Set(orgBranchIds);
  const requested = input.branchIds === undefined ? undefined : unique(input.branchIds);

  if (requested) {
    const unknown = requested.filter((id) => !orgSet.has(id));
    if (unknown.length > 0) {
      throw new ValidationError('Unknown branch', { branchIds: unknown }, 'BRANCH_NOT_FOUND');
    }
  }

  if (scope.allBranches) {
    if (input.availableInAllBranches === true) {
      return { availableInAllBranches: true, branchIds: [] };
    }
    if (input.availableInAllBranches === false || requested !== undefined) {
      if (!requested || requested.length === 0) {
        throw new ValidationError(
          'Pick at least one branch',
          { field: 'branchIds' },
          'BRANCH_AVAILABILITY_EMPTY',
        );
      }
      return { availableInAllBranches: false, branchIds: requested };
    }
    return current ?? { availableInAllBranches: true, branchIds: [] };
  }

  // Scoped staff.
  const own = unique(scope.branchIds.filter((id) => orgSet.has(id)));
  const ownSet = new Set(own);

  if (current === null) {
    if (input.availableInAllBranches === true) {
      throw new ForbiddenError(
        'Only staff with access to all branches can make an item available in all branches',
        {},
        'BRANCH_SCOPE_FORBIDDEN',
      );
    }
    const chosen = requested ?? own;
    assertOwn(chosen, ownSet);
    if (chosen.length === 0) {
      throw new ValidationError(
        'Pick at least one branch',
        { field: 'branchIds' },
        'BRANCH_AVAILABILITY_EMPTY',
      );
    }
    return { availableInAllBranches: false, branchIds: chosen };
  }

  if (input.availableInAllBranches === true) {
    if (current.availableInAllBranches) {
      return current;
    }
    throw new ForbiddenError(
      'Only staff with access to all branches can make an item available in all branches',
      {},
      'BRANCH_SCOPE_FORBIDDEN',
    );
  }
  if (requested === undefined) {
    return current;
  }
  assertOwn(requested, ownSet);

  const currentSet = current.availableInAllBranches
    ? new Set(orgBranchIds)
    : new Set(current.branchIds);
  const wantedOwn = new Set(requested);
  if (current.availableInAllBranches && own.every((id) => wantedOwn.has(id))) {
    return current;
  }
  for (const id of own) {
    if (wantedOwn.has(id)) {
      currentSet.add(id);
    } else {
      currentSet.delete(id);
    }
  }
  return { availableInAllBranches: false, branchIds: [...currentSet] };
}

function assertOwn(ids: string[], ownSet: Set<string>): void {
  const outside = ids.filter((id) => !ownSet.has(id));
  if (outside.length > 0) {
    throw new ForbiddenError(
      'You can only manage availability for your own branches',
      { branchIds: outside },
      'BRANCH_SCOPE_FORBIDDEN',
    );
  }
}
