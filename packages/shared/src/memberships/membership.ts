import { z } from 'zod';

export const membershipListItemSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  userEmail: z.email(),
  userName: z.string(),
  roleKey: z.string(),
  roleName: z.string(),
  status: z.enum(['active', 'invited', 'disabled']),
  allBranches: z.boolean(),
  branchIds: z.array(z.uuid()),
});

export type MembershipListItem = z.infer<typeof membershipListItemSchema>;

export const membershipListResponseSchema = z.object({
  items: z.array(membershipListItemSchema),
});
