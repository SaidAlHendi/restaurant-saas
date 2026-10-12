import { z } from 'zod';

import { loginResponseSchema } from './login.js';
import { staffRoleKeySchema } from '../staff/staff.js';

export const invitePreviewResponseSchema = z.object({
  orgName: z.string(),
  email: z.email().nullable(),
  roleKey: staffRoleKeySchema,
  passwordRequired: z.boolean(),
});

export type InvitePreviewResponse = z.infer<typeof invitePreviewResponseSchema>;

export const acceptInviteBodySchema = z.object({
  token: z.string().min(1).max(512),
  name: z.string().trim().min(1).max(200).optional(),
  password: z.string().min(10).max(128),
});

export type AcceptInviteBody = z.infer<typeof acceptInviteBodySchema>;

export const acceptInviteResponseSchema = loginResponseSchema;

export type AcceptInviteResponse = z.infer<typeof acceptInviteResponseSchema>;
