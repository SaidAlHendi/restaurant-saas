import { filterStaffByActorBranches } from './staff-visibility';

const m = (id: string, branchIds: string[], extra = {}) => ({
  id,
  isSelf: false,
  allBranches: false,
  branchIds,
  ...extra,
});

describe('filterStaffByActorBranches', () => {
  it('keeps self, all-branch members and members sharing a branch', () => {
    const items = [
      m('self', ['z'], { isSelf: true }),
      m('all', [], { allBranches: true }),
      m('shared', ['a', 'x']),
      m('other', ['x']),
      m('none', []),
    ];
    const ids = filterStaffByActorBranches(items, ['a', 'b']).map((i) => i.id);
    expect(ids).toEqual(['self', 'all', 'shared']);
  });
});
