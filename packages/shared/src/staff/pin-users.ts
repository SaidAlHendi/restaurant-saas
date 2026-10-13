import { z } from 'zod';

import { staffRoleKeySchema } from './staff.js';

export const pinUserListItemSchema = z.object({
  membershipId: z.uuid(),
  name: z.string(),
  roleKey: staffRoleKeySchema,
});

export type PinUserListItem = z.infer<typeof pinUserListItemSchema>;

export const pinUserListResponseSchema = z.object({
  items: z.array(pinUserListItemSchema),
});

export type PinUserListResponse = z.infer<typeof pinUserListResponseSchema>;
