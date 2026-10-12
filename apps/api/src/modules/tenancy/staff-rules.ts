import type { SystemRoleKey } from '@app/shared';

export type StaffRulesActor = {
  membershipId: string;
  roleKey: SystemRoleKey;
};

export type StaffRulesTarget = {
  membershipId: string;
  roleKey: SystemRoleKey;
  status: 'active' | 'invited' | 'disabled';
};

export type StaffRulesChange = {
  roleKey?: SystemRoleKey;
  status?: 'active' | 'disabled';
  allBranches?: boolean;
  branchIds?: string[];
};

export type StaffRulesContext = {
  isSelf: boolean;
  activeOwnerCount: number;
};

export type CanManageMemberResult =
  | { ok: true }
  | { ok: false; reason: 'FORBIDDEN' | 'LAST_OWNER' };

const MANAGER_MANAGEABLE: SystemRoleKey[] = ['cashier', 'kitchen'];

function isOwnerRole(roleKey: SystemRoleKey): boolean {
  return roleKey === 'owner';
}

export function canAssignRole(actorRole: SystemRoleKey, roleKey: SystemRoleKey): boolean {
  if (actorRole === 'owner') {
    return true;
  }
  if (actorRole === 'manager') {
    return MANAGER_MANAGEABLE.includes(roleKey);
  }
  return false;
}

export function canManageMember(
  actor: StaffRulesActor,
  target: StaffRulesTarget,
  change: StaffRulesChange,
  ctx: StaffRulesContext,
): CanManageMemberResult {
  if (ctx.isSelf) {
    if (
      change.roleKey !== undefined ||
      change.status !== undefined ||
      change.allBranches !== undefined ||
      change.branchIds !== undefined
    ) {
      return { ok: false, reason: 'FORBIDDEN' };
    }
  }

  if (actor.roleKey === 'manager') {
    if (!MANAGER_MANAGEABLE.includes(target.roleKey)) {
      return { ok: false, reason: 'FORBIDDEN' };
    }
    if (change.roleKey !== undefined && !MANAGER_MANAGEABLE.includes(change.roleKey)) {
      return { ok: false, reason: 'FORBIDDEN' };
    }
  }

  const nextRole = change.roleKey ?? target.roleKey;
  const nextStatus = change.status ?? target.status;

  if (isOwnerRole(target.roleKey) && target.status === 'active') {
    const demotingOwner = change.roleKey !== undefined && change.roleKey !== 'owner';
    const disablingOwner = change.status === 'disabled';
    if (demotingOwner || disablingOwner) {
      if (ctx.activeOwnerCount <= 1) {
        return { ok: false, reason: 'LAST_OWNER' };
      }
    }
  }

  if (actor.roleKey !== 'owner' && actor.roleKey !== 'manager') {
    return { ok: false, reason: 'FORBIDDEN' };
  }

  if (change.roleKey !== undefined && !canAssignRole(actor.roleKey, change.roleKey)) {
    return { ok: false, reason: 'FORBIDDEN' };
  }

  if (nextStatus === 'disabled' && isOwnerRole(nextRole) && ctx.activeOwnerCount <= 1) {
    return { ok: false, reason: 'LAST_OWNER' };
  }

  return { ok: true };
}

export function canInviteRole(actorRole: SystemRoleKey, roleKey: SystemRoleKey): boolean {
  return canAssignRole(actorRole, roleKey);
}
