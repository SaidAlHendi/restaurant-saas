import { z } from 'zod';

import { PERMISSION_KEYS } from '../permissions.js';

export const permissionKeySchema = z.enum(PERMISSION_KEYS);

/** Permissions the Owner may grant or deny per employee. `org.manage` and `billing.manage` stay role-only. */
export const OVERRIDABLE_PERMISSION_KEYS = PERMISSION_KEYS.filter(
  (k) => k !== 'org.manage' && k !== 'billing.manage',
);

export const overridablePermissionKeySchema = z.enum(
  OVERRIDABLE_PERMISSION_KEYS as [
    (typeof OVERRIDABLE_PERMISSION_KEYS)[number],
    ...(typeof OVERRIDABLE_PERMISSION_KEYS)[number][],
  ],
);

export const putStaffPermissionOverridesBodySchema = z
  .object({
    grant: z.array(overridablePermissionKeySchema).max(PERMISSION_KEYS.length),
    deny: z.array(overridablePermissionKeySchema).max(PERMISSION_KEYS.length),
  })
  .refine((v) => !v.grant.some((k) => v.deny.includes(k)), {
    message: 'A permission cannot be both granted and denied',
  });
export type PutStaffPermissionOverridesBody = z.infer<typeof putStaffPermissionOverridesBodySchema>;

export const staffPermissionOverridesResponseSchema = z.object({
  rolePermissions: z.array(z.string()),
  grant: z.array(z.string()),
  deny: z.array(z.string()),
  effective: z.array(z.string()),
});
export type StaffPermissionOverridesResponse = z.infer<typeof staffPermissionOverridesResponseSchema>;

/** Effective permissions: role permissions, plus grants, minus denies. */
export function computeEffectivePermissions(
  rolePermissions: readonly string[],
  grant: readonly string[],
  deny: readonly string[],
): string[] {
  const denied = new Set(deny);
  return [...new Set([...rolePermissions, ...grant])].filter((k) => !denied.has(k));
}
