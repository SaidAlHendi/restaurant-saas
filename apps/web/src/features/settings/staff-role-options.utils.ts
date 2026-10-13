import {
  SYSTEM_ROLE_KEYS,
  canAssignRole,
  canInviteRole,
  pinOnlyRoleKeySchema,
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

export function pinOnlyInvitableRoleKeys(actorRoleKey: SystemRoleKey | null): SystemRoleKey[] {
  return invitableRoleKeys(actorRoleKey).filter((roleKey) =>
    (pinOnlyRoleKeySchema.options as readonly string[]).includes(roleKey),
  );
}

export function asPinOnlyRoleKey(roleKey: SystemRoleKey): CreatePinOnlyStaffBody['roleKey'] | null {
  const parsed = pinOnlyRoleKeySchema.safeParse(roleKey);
  return parsed.success ? parsed.data : null;
}

export function assignableRoleKeysForPinOnlyMember(actorRoleKey: SystemRoleKey | null): SystemRoleKey[] {
  return assignableRoleKeys(actorRoleKey).filter((roleKey) =>
    (pinOnlyRoleKeySchema.options as readonly string[]).includes(roleKey),
  );
}
