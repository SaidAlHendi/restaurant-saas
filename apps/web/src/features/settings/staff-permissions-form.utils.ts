import { computeEffectivePermissions } from '@app/shared';

export type PermissionDraft = { grant: string[]; deny: string[] };

/** Sets one permission on or off for the employee; stores an override only when it differs from the role. */
export function setPermissionEnabled(
  rolePermissions: readonly string[],
  draft: PermissionDraft,
  key: string,
  enabled: boolean,
): PermissionDraft {
  const grant = draft.grant.filter((k) => k !== key);
  const deny = draft.deny.filter((k) => k !== key);
  if (enabled !== rolePermissions.includes(key)) {
    (enabled ? grant : deny).push(key);
  }
  return { grant, deny };
}

export function isPermissionEnabled(
  rolePermissions: readonly string[],
  draft: PermissionDraft,
  key: string,
): boolean {
  return computeEffectivePermissions(rolePermissions, draft.grant, draft.deny).includes(key);
}

export function hasPermissionOverride(draft: PermissionDraft, key: string): boolean {
  return draft.grant.includes(key) || draft.deny.includes(key);
}
