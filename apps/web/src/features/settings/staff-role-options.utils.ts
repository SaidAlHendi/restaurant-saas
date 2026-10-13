import {
  SYSTEM_ROLE_KEYS,
  canAssignRole,
  canInviteRole,
  type CreatePinOnlyStaffBody,
  type SystemRoleKey,
} from '@app/shared';

export function parseSystemRoleKey(key: string | undefined): SystemRoleKey | null {
  if (key === undefined) {
    return null;
  }
  return (SYSTEM_ROLE_KEYS as readonly string[]).includes(key) ? (key as SystemRoleKey) : null;
}

export function assignableRoleKeys(actorRoleKey: SystemRoleKey | null): SystemRoleKey[] {
  if (actorRoleKey === null) {
    return [];
  }
  return SYSTEM_ROLE_KEYS.filter((roleKey) => canAssignRole(actorRoleKey, roleKey));
}

export function invitableRoleKeys(actorRoleKey: SystemRoleKey | null): SystemRoleKey[] {
  if (actorRoleKey === null) {
    return [];
  }
  return SYSTEM_ROLE_KEYS.filter((roleKey) => canInviteRole(actorRoleKey, roleKey));
}

/** PIN-only staff may not be owners. */
export const PIN_ONLY_ROLE_KEYS = ['cashier', 'kitchen', 'manager'] as const satisfies readonly SystemRoleKey[];

export function pinOnlyInvitableRoleKeys(actorRoleKey: SystemRoleKey | null): SystemRoleKey[] {
  return invitableRoleKeys(actorRoleKey).filter((roleKey) =>
    (PIN_ONLY_ROLE_KEYS as readonly string[]).includes(roleKey),
  );
}

export function asPinOnlyRoleKey(
  roleKey: SystemRoleKey,
): CreatePinOnlyStaffBody['roleKey'] | null {
  if ((PIN_ONLY_ROLE_KEYS as readonly string[]).includes(roleKey)) {
    if (roleKey === 'cashier' || roleKey === 'kitchen' || roleKey === 'manager') {
      return roleKey;
    }
  }
  return null;
}
