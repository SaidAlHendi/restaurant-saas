import { ForbiddenError, ValidationError } from '../../core/errors/app-errors';

import { resolveBranchAvailability } from './branch-availability';

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const C = '00000000-0000-4000-8000-00000000000c';
const ORG = [A, B, C];
const FULL = { allBranches: true, branchIds: ORG };
const ONLY_A = { allBranches: false, branchIds: [A] };
const ALL = { availableInAllBranches: true, branchIds: [] as string[] };

describe('resolveBranchAvailability', () => {
  describe('full scope', () => {
    it('defaults to all branches on create', () => {
      expect(
        resolveBranchAvailability({ scope: FULL, orgBranchIds: ORG, input: {}, current: null }),
      ).toEqual(ALL);
    });

    it('stores an explicit list and drops duplicates', () => {
      expect(
        resolveBranchAvailability({
          scope: FULL,
          orgBranchIds: ORG,
          input: { availableInAllBranches: false, branchIds: [A, A, B] },
          current: null,
        }),
      ).toEqual({ availableInAllBranches: false, branchIds: [A, B] });
    });

    it('switches back to all branches and clears the list', () => {
      expect(
        resolveBranchAvailability({
          scope: FULL,
          orgBranchIds: ORG,
          input: { availableInAllBranches: true, branchIds: [A] },
          current: { availableInAllBranches: false, branchIds: [A] },
        }),
      ).toEqual(ALL);
    });

    it('keeps the current value when the input is empty', () => {
      const current = { availableInAllBranches: false, branchIds: [B] };
      expect(
        resolveBranchAvailability({ scope: FULL, orgBranchIds: ORG, input: {}, current }),
      ).toBe(current);
    });

    it('rejects an empty explicit list and unknown branches', () => {
      expect(() =>
        resolveBranchAvailability({
          scope: FULL,
          orgBranchIds: ORG,
          input: { availableInAllBranches: false, branchIds: [] },
          current: null,
        }),
      ).toThrow(ValidationError);
      expect(() =>
        resolveBranchAvailability({
          scope: FULL,
          orgBranchIds: ORG,
          input: { availableInAllBranches: false, branchIds: ['00000000-0000-4000-8000-0000000000ff'] },
          current: null,
        }),
      ).toThrow(ValidationError);
    });
  });

  describe('scoped staff', () => {
    it('defaults to their own branches on create', () => {
      expect(
        resolveBranchAvailability({ scope: ONLY_A, orgBranchIds: ORG, input: {}, current: null }),
      ).toEqual({ availableInAllBranches: false, branchIds: [A] });
    });

    it('cannot create an all-branches item or pick a foreign branch', () => {
      expect(() =>
        resolveBranchAvailability({
          scope: ONLY_A,
          orgBranchIds: ORG,
          input: { availableInAllBranches: true },
          current: null,
        }),
      ).toThrow(ForbiddenError);
      expect(() =>
        resolveBranchAvailability({
          scope: ONLY_A,
          orgBranchIds: ORG,
          input: { availableInAllBranches: false, branchIds: [A, B] },
          current: null,
        }),
      ).toThrow(ForbiddenError);
    });

    it('hides an all-branches item from their branch only', () => {
      const result = resolveBranchAvailability({
        scope: ONLY_A,
        orgBranchIds: ORG,
        input: { availableInAllBranches: false, branchIds: [] },
        current: ALL,
      });
      expect(result.availableInAllBranches).toBe(false);
      expect([...result.branchIds].sort()).toEqual([B, C]);
    });

    it('leaves an all-branches item untouched when their branch stays on', () => {
      expect(
        resolveBranchAvailability({
          scope: ONLY_A,
          orgBranchIds: ORG,
          input: { availableInAllBranches: false, branchIds: [A] },
          current: ALL,
        }),
      ).toBe(ALL);
    });

    it('adds and removes only their own branches on an explicit list', () => {
      const added = resolveBranchAvailability({
        scope: ONLY_A,
        orgBranchIds: ORG,
        input: { availableInAllBranches: false, branchIds: [A] },
        current: { availableInAllBranches: false, branchIds: [B] },
      });
      expect([...added.branchIds].sort()).toEqual([A, B]);

      const removed = resolveBranchAvailability({
        scope: ONLY_A,
        orgBranchIds: ORG,
        input: { availableInAllBranches: false, branchIds: [] },
        current: { availableInAllBranches: false, branchIds: [A, B] },
      });
      expect(removed).toEqual({ availableInAllBranches: false, branchIds: [B] });
    });

    it('cannot turn an explicit list back into all branches', () => {
      expect(() =>
        resolveBranchAvailability({
          scope: ONLY_A,
          orgBranchIds: ORG,
          input: { availableInAllBranches: true },
          current: { availableInAllBranches: false, branchIds: [A] },
        }),
      ).toThrow(ForbiddenError);
    });
  });
});
