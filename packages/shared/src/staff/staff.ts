import { z } from 'zod';

import { SYSTEM_ROLE_KEYS } from '../permissions.js';

export const staffRoleKeySchema = z.enum(SYSTEM_ROLE_KEYS);
export type StaffRoleKey = z.infer<typeof staffRoleKeySchema>;

export const pinOnlyRoleKeySchema = z.enum(['cashier', 'kitchen', 'manager']);

export const staffPinSchema = z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits');

export const staffListItemSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string(),
  email: z.email().nullable(),
  roleKey: staffRoleKeySchema,
  status: z.enum(['active', 'invited', 'disabled']),
  allBranches: z.boolean(),
  branchIds: z.array(z.uuid()),
  hasPin: z.boolean(),
  inviteExpiresAt: z.iso.datetime().nullable(),
  isSelf: z.boolean(),
});

export type StaffListItem = z.infer<typeof staffListItemSchema>;

export const staffListResponseSchema = z.object({
  items: z.array(staffListItemSchema),
});

export type StaffListResponse = z.infer<typeof staffListResponseSchema>;

export const createStaffInviteBodySchema = z.object({
  email: z.email(),
  name: z.string().trim().min(1).max(200).optional(),
  roleKey: staffRoleKeySchema,
  allBranches: z.boolean(),
  branchIds: z.array(z.uuid()),
});

export type CreateStaffInviteBody = z.infer<typeof createStaffInviteBodySchema>;

export const createStaffInviteResponseSchema = z.object({
  membershipId: z.uuid(),
  inviteUrl: z.url(),
  inviteExpiresAt: z.iso.datetime(),
});

export type CreateStaffInviteResponse = z.infer<typeof createStaffInviteResponseSchema>;

export const regenerateStaffInviteResponseSchema = createStaffInviteResponseSchema;

export const createPinOnlyStaffBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  roleKey: pinOnlyRoleKeySchema,
  allBranches: z.boolean(),
  branchIds: z.array(z.uuid()),
  pin: staffPinSchema,
});

export type CreatePinOnlyStaffBody = z.infer<typeof createPinOnlyStaffBodySchema>;

export const patchStaffMembershipBodySchema = z.object({
  roleKey: staffRoleKeySchema.optional(),
  allBranches: z.boolean().optional(),
  branchIds: z.array(z.uuid()).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  name: z.string().trim().min(1).max(200).optional(),
});

export type PatchStaffMembershipBody = z.infer<typeof patchStaffMembershipBodySchema>;

export const putStaffPinBodySchema = z.object({
  pin: staffPinSchema,
});

export type PutStaffPinBody = z.infer<typeof putStaffPinBodySchema>;
