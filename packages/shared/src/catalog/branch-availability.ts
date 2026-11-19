import { z } from 'zod';

/** Response fields describing which branches show a product or category. */
export const branchAvailabilityFields = {
  availableInAllBranches: z.boolean(),
  /** Explicit branch list. Empty when `availableInAllBranches` is true. */
  branchIds: z.array(z.uuid()),
};

/** Request fields. Omit both to keep the current value (patch) or use the default (create). */
export const branchAvailabilityInputFields = {
  availableInAllBranches: z.boolean().optional(),
  branchIds: z.array(z.uuid()).max(500).optional(),
};

export type BranchAvailabilityInput = {
  availableInAllBranches?: boolean | undefined;
  branchIds?: string[] | undefined;
};

/** `availableInAllBranches: false` must come with a branch list (it may be empty only on patch). */
export function branchAvailabilityInputValid(input: BranchAvailabilityInput): boolean {
  return input.availableInAllBranches !== false || input.branchIds !== undefined;
}

export const BRANCH_AVAILABILITY_INPUT_MESSAGE =
  'branchIds is required when availableInAllBranches is false';
