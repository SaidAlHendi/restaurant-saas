import { describe, expect, it } from 'vitest';

import type { StaffListItem } from '@app/shared';

import { staffRowActions } from './staff-row-actions.utils.js';

function target(
  overrides: Partial<StaffListItem> & Pick<StaffListItem, 'id' | 'roleKey' | 'status'>,
): StaffRowActionsInputTarget {
  return {
    isSelf: false,
    hasPin: false,
    ...overrides,
  };
}

type StaffRowActionsInputTarget = Pick<
  StaffListItem,
  'id' | 'roleKey' | 'status' | 'isSelf' | 'hasPin'
>;

const ownerActor = {
  actorMembershipId: 'actor-owner',
  actorRoleKey: 'owner' as const,
  hasStaffManage: true,
  activeOwnerCount: 2,
};

const managerActor = {
  actorMembershipId: 'actor-mgr',
  actorRoleKey: 'manager' as const,
  hasStaffManage: true,
  activeOwnerCount: 2,
};

describe('staffRowActions', () => {
  it('owner can manage cashier and invited rows', () => {
    const active = staffRowActions({
      ...ownerActor,
      target: target({ id: 't1', roleKey: 'cashier', status: 'active' }),
    });
    expect(active.canEditMembership).toBe(true);
    expect(active.canDisable).toBe(true);
    expect(active.canRegenerateInvite).toBe(false);

    const invited = staffRowActions({
      ...ownerActor,
      target: target({ id: 't2', roleKey: 'kitchen', status: 'invited' }),
    });
    expect(invited.canRegenerateInvite).toBe(true);
    expect(invited.canRevokeInvite).toBe(true);
    expect(invited.canDisable).toBe(false);
  });

  it('manager cannot manage owner or manager targets', () => {
    const ownerRow = staffRowActions({
      ...managerActor,
      target: target({ id: 't1', roleKey: 'owner', status: 'active' }),
    });
    expect(ownerRow.canEditMembership).toBe(false);
    expect(ownerRow.canDisable).toBe(false);

    const mgrRow = staffRowActions({
      ...managerActor,
      target: target({ id: 't2', roleKey: 'manager', status: 'active' }),
    });
    expect(mgrRow.canEditMembership).toBe(false);
  });

  it('manager can disable cashier', () => {
    const row = staffRowActions({
      ...managerActor,
      target: target({ id: 't1', roleKey: 'cashier', status: 'active' }),
    });
    expect(row.canDisable).toBe(true);
    expect(row.canEditMembership).toBe(true);
  });

  it('self row skips membership edits but allows PIN when permitted', () => {
    const self = staffRowActions({
      ...managerActor,
      target: target({
        id: 'actor-mgr',
        roleKey: 'manager',
        status: 'active',
        isSelf: true,
      }),
    });
    expect(self.canEditMembership).toBe(false);
    expect(self.canDisable).toBe(false);
    expect(self.canSetPin).toBe(true);
  });

  it('disabled member can be re-enabled when allowed', () => {
    const row = staffRowActions({
      ...ownerActor,
      target: target({ id: 't1', roleKey: 'cashier', status: 'disabled' }),
    });
    expect(row.canEnable).toBe(true);
    expect(row.canDisable).toBe(false);
  });

  it('read-only actor gets no manage actions', () => {
    const row = staffRowActions({
      actorMembershipId: 'c1',
      actorRoleKey: 'cashier',
      hasStaffManage: false,
      activeOwnerCount: 2,
      target: target({ id: 't1', roleKey: 'kitchen', status: 'active' }),
    });
    expect(row.canEditMembership).toBe(false);
    expect(row.canSetPin).toBe(false);
  });

  it('last owner cannot be disabled from UI rules', () => {
    const row = staffRowActions({
      ...ownerActor,
      activeOwnerCount: 1,
      target: target({ id: 'o1', roleKey: 'owner', status: 'active' }),
    });
    expect(row.canDisable).toBe(false);
  });
});
