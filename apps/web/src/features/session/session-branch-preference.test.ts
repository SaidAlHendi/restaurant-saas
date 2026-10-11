import { describe, expect, it, beforeEach } from 'vitest';

import {
  branchPreferenceStorageKey,
  pickCurrentBranchId,
  readStoredBranchId,
  writeStoredBranchId,
} from './session-branch-preference.js';

const orgId = '01932a1a-7b3e-7000-8000-000000000010';
const branchA = '01932a1a-7b3e-7000-8000-000000000030';
const branchB = '01932a1a-7b3e-7000-8000-000000000031';

describe('session-branch-preference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads and writes branch preference per org', () => {
    writeStoredBranchId(orgId, branchB);
    expect(readStoredBranchId(orgId)).toBe(branchB);
    expect(branchPreferenceStorageKey(orgId)).toBe(`rs.branch.${orgId}`);
  });

  it('pickCurrentBranchId prefers API branch, then stored, then previous, then first', () => {
    writeStoredBranchId(orgId, branchB);
    const branches = [
      { id: branchA, name: 'A' },
      { id: branchB, name: 'B' },
    ];

    expect(
      pickCurrentBranchId({
        meCurrentBranchId: branchA,
        branches,
        previousBranchId: null,
        storedBranchId: branchB,
      }),
    ).toBe(branchA);

    expect(
      pickCurrentBranchId({
        meCurrentBranchId: null,
        branches,
        previousBranchId: null,
        storedBranchId: branchB,
      }),
    ).toBe(branchB);

    expect(
      pickCurrentBranchId({
        meCurrentBranchId: null,
        branches,
        previousBranchId: branchA,
        storedBranchId: null,
      }),
    ).toBe(branchA);

    expect(
      pickCurrentBranchId({
        meCurrentBranchId: null,
        branches,
        previousBranchId: null,
        storedBranchId: null,
      }),
    ).toBe(branchA);
  });
});
