import { z } from 'zod';

export const ADMIN_ROLES = ['super', 'support', 'billing'] as const;

export const adminRoleSchema = z.enum(ADMIN_ROLES);

export type AdminRole = z.infer<typeof adminRoleSchema>;

/** support < billing < super. `support` reads, `billing` adds subscriptions, `super` adds suspend and admin management. */
const ADMIN_ROLE_RANK: Record<AdminRole, number> = { support: 1, billing: 2, super: 3 };

export function adminRoleSatisfies(actual: AdminRole, minimum: AdminRole): boolean {
  return ADMIN_ROLE_RANK[actual] >= ADMIN_ROLE_RANK[minimum];
}
