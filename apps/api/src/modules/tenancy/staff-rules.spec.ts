import { canAssignRole, canInviteRole, canManageMember } from './staff-rules';

describe('canManageMember', () => {
  const ownerActor = { membershipId: 'a1', roleKey: 'owner' as const };
  const managerActor = { membershipId: 'm1', roleKey: 'manager' as const };

  it('owner can change cashier role', () => {
    const result = canManageMember(
      ownerActor,
      { membershipId: 't1', roleKey: 'cashier', status: 'active' },
      { roleKey: 'kitchen' },
      { isSelf: false, activeOwnerCount: 1 },
    );
    expect(result).toEqual({ ok: true });
  });

  it('manager cannot change owner', () => {
    const result = canManageMember(
      managerActor,
      { membershipId: 't1', roleKey: 'owner', status: 'active' },
      { status: 'disabled' },
      { isSelf: false, activeOwnerCount: 1 },
    );
    expect(result).toEqual({ ok: false, reason: 'FORBIDDEN' });
  });

  it('manager cannot invite or assign manager', () => {
    expect(canInviteRole('manager', 'manager')).toBe(false);
    expect(canAssignRole('manager', 'owner')).toBe(false);
  });

  it('nobody changes own role or status', () => {
    const result = canManageMember(
      managerActor,
      { membershipId: 'm1', roleKey: 'manager', status: 'active' },
      { status: 'disabled' },
      { isSelf: true, activeOwnerCount: 2 },
    );
    expect(result).toEqual({ ok: false, reason: 'FORBIDDEN' });
  });

  it('last owner cannot be demoted', () => {
    const result = canManageMember(
      ownerActor,
      { membershipId: 'o1', roleKey: 'owner', status: 'active' },
      { roleKey: 'manager' },
      { isSelf: false, activeOwnerCount: 1 },
    );
    expect(result).toEqual({ ok: false, reason: 'LAST_OWNER' });
  });

  it('last owner cannot be disabled', () => {
    const result = canManageMember(
      ownerActor,
      { membershipId: 'o1', roleKey: 'owner', status: 'active' },
      { status: 'disabled' },
      { isSelf: false, activeOwnerCount: 1 },
    );
    expect(result).toEqual({ ok: false, reason: 'LAST_OWNER' });
  });

  it('owner can demote when another active owner exists', () => {
    const result = canManageMember(
      ownerActor,
      { membershipId: 'o1', roleKey: 'owner', status: 'active' },
      { roleKey: 'manager' },
      { isSelf: false, activeOwnerCount: 2 },
    );
    expect(result).toEqual({ ok: true });
  });
});
