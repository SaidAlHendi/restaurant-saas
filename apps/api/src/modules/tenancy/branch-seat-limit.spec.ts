import { countBranchSeats, seatCountViolatesLimit } from './branch-seat-limit';

describe('countBranchSeats', () => {
  const branchA = '00000000-0000-4000-8000-000000000301';
  const branchB = '00000000-0000-4000-8000-000000000302';

  it('counts active and invited, not disabled', () => {
    const n = countBranchSeats(
      [
        { id: '1', status: 'active', allBranches: false, branchIds: [branchA] },
        { id: '2', status: 'invited', allBranches: false, branchIds: [branchA] },
        { id: '3', status: 'disabled', allBranches: false, branchIds: [branchA] },
      ],
      branchA,
    );
    expect(n).toBe(2);
  });

  it('allBranches member counts on every branch', () => {
    const members = [
      { id: '1', status: 'active' as const, allBranches: true, branchIds: [] },
      { id: '2', status: 'active' as const, allBranches: false, branchIds: [branchB] },
    ];
    expect(countBranchSeats(members, branchA)).toBe(1);
    expect(countBranchSeats(members, branchB)).toBe(2);
  });
});

describe('seatCountViolatesLimit', () => {
  it('add_one blocks when count+1 exceeds max', () => {
    expect(seatCountViolatesLimit(10, 10, 'add_one')).toBe(true);
    expect(seatCountViolatesLimit(9, 10, 'add_one')).toBe(false);
  });

  it('already_reserved allows count equal to max', () => {
    expect(seatCountViolatesLimit(10, 10, 'already_reserved')).toBe(false);
    expect(seatCountViolatesLimit(11, 10, 'already_reserved')).toBe(true);
  });
});
