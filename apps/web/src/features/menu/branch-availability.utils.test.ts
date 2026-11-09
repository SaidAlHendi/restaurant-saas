import { describe, expect, it } from 'vitest';

import {
  branchAvailabilityDefaults,
  branchAvailabilityToApi,
  showBranchAvailability,
  toggleBranchId,
} from './branch-availability.utils.js';

const A = 'a';
const B = 'b';
const C = 'c';
const FULL = { allBranchesScope: true, ownBranchIds: [A, B, C] };
const SCOPED = { allBranchesScope: false, ownBranchIds: [A, B] };

describe('branchAvailabilityDefaults', () => {
  it('defaults to all branches for full-scope staff on create', () => {
    expect(branchAvailabilityDefaults(undefined, FULL)).toEqual({
      availableInAllBranches: true,
      branchIds: [],
    });
  });

  it('keeps an existing item as stored for full-scope staff', () => {
    expect(
      branchAvailabilityDefaults({ availableInAllBranches: false, branchIds: [B] }, FULL),
    ).toEqual({ availableInAllBranches: false, branchIds: [B] });
  });

  it('starts scoped staff with their own branches ticked on create', () => {
    expect(branchAvailabilityDefaults(undefined, SCOPED)).toEqual({
      availableInAllBranches: false,
      branchIds: [A, B],
    });
  });

  it('shows an all-branches item as ticked in every own branch for scoped staff', () => {
    expect(
      branchAvailabilityDefaults({ availableInAllBranches: true, branchIds: [] }, SCOPED),
    ).toEqual({ availableInAllBranches: false, branchIds: [A, B] });
  });

  it('ignores branches outside the scope for scoped staff', () => {
    expect(
      branchAvailabilityDefaults({ availableInAllBranches: false, branchIds: [B, C] }, SCOPED),
    ).toEqual({ availableInAllBranches: false, branchIds: [B] });
  });
});

describe('branchAvailabilityToApi', () => {
  it('sends only the flag for all branches', () => {
    expect(
      branchAvailabilityToApi({ availableInAllBranches: true, branchIds: [A] }, FULL),
    ).toEqual({ availableInAllBranches: true });
  });

  it('sends the list when specific branches are chosen', () => {
    expect(
      branchAvailabilityToApi({ availableInAllBranches: false, branchIds: [A] }, FULL),
    ).toEqual({ availableInAllBranches: false, branchIds: [A] });
  });

  it('never sends "all branches" for scoped staff', () => {
    expect(
      branchAvailabilityToApi({ availableInAllBranches: true, branchIds: [A] }, SCOPED),
    ).toEqual({ availableInAllBranches: false, branchIds: [A] });
  });
});

describe('showBranchAvailability', () => {
  it('hides the field when there is nothing to choose', () => {
    expect(showBranchAvailability({ allBranchesScope: true, ownBranchIds: [A] })).toBe(false);
    expect(showBranchAvailability(FULL)).toBe(true);
    expect(showBranchAvailability({ allBranchesScope: false, ownBranchIds: [A] })).toBe(true);
  });
});

describe('toggleBranchId', () => {
  it('adds and removes without duplicates', () => {
    expect(toggleBranchId([A], B, true)).toEqual([A, B]);
    expect(toggleBranchId([A, B], B, true)).toEqual([A, B]);
    expect(toggleBranchId([A, B], A, false)).toEqual([B]);
  });
});
