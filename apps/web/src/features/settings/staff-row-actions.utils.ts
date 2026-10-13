import {
  canManageMember,
  type StaffListItem,
  type SystemRoleKey,
} from '@app/shared';

export type StaffRowActions = {
  canEditMembership: boolean;
  canDisable: boolean;
  canEnable: boolean;
  canRegenerateInvite: boolean;
  canRevokeInvite: boolean;
  canSetPin: boolean;
  canRemovePin: boolean;
};

export type StaffRowActionsInput = {
  actorMembershipId: string;
  actorRoleKey: SystemRoleKey;
  hasStaffManage: boolean;
  activeOwnerCount: number;
  target: Pick<
    StaffListItem,
    'id' | 'roleKey' | 'status' | 'isSelf' | 'hasPin'
  >;
};

function canManage(
  input: StaffRowActionsInput,
  change: Parameters<typeof canManageMember>[2],
): boolean {
  if (!input.hasStaffManage) {
    return false;
  }
  const target = {
    membershipId: input.target.id,
    roleKey: input.target.roleKey,
    status: input.target.status,
  };
  const actor = { membershipId: input.actorMembershipId, roleKey: input.actorRoleKey };
  const ctx = {
    isSelf: input.target.isSelf,
    activeOwnerCount: input.activeOwnerCount,
  };
  return canManageMember(actor, target, change, ctx).ok;
}

export function staffRowActions(input: StaffRowActionsInput): StaffRowActions {
  const { target, hasStaffManage } = input;
  const canEditMembership =
    hasStaffManage &&
    !target.isSelf &&
    canManage(input, { roleKey: target.roleKey });

  const canDisable =
    hasStaffManage &&
    target.status === 'active' &&
    !target.isSelf &&
    canManage(input, { status: 'disabled' });

  const canEnable =
    hasStaffManage && target.status === 'disabled' && canManage(input, { status: 'active' });

  const inviteManage =
    hasStaffManage && target.status === 'invited' && canManage(input, {});

  const pinManage =
    (target.isSelf || hasStaffManage) &&
    (target.isSelf || canManage(input, {}));

  return {
    canEditMembership,
    canDisable,
    canEnable,
    canRegenerateInvite: inviteManage,
    canRevokeInvite: inviteManage,
    canSetPin: pinManage,
    canRemovePin: pinManage && target.hasPin,
  };
}
