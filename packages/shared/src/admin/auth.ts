import { z } from 'zod';

import { adminRoleSchema } from './roles.js';

export const adminLoginBodySchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
});

export type AdminLoginBody = z.infer<typeof adminLoginBodySchema>;

export const adminUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string(),
  role: adminRoleSchema,
});

export type AdminUser = z.infer<typeof adminUserSchema>;

export const adminLoginResponseSchema = z.object({
  accessToken: z.string(),
  admin: adminUserSchema,
});

export type AdminLoginResponse = z.infer<typeof adminLoginResponseSchema>;

export const adminRefreshResponseSchema = z.object({
  accessToken: z.string(),
});

export type AdminRefreshResponse = z.infer<typeof adminRefreshResponseSchema>;

export const adminMeResponseSchema = z.object({
  admin: adminUserSchema,
});

export type AdminMeResponse = z.infer<typeof adminMeResponseSchema>;

export const createAdminUserInputSchema = z.object({
  email: z.email(),
  password: z.string().min(12).max(128),
  name: z.string().min(1).max(120),
  role: adminRoleSchema,
});

export type CreateAdminUserInput = z.infer<typeof createAdminUserInputSchema>;
