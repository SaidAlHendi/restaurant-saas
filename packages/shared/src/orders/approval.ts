import { z } from 'zod';

import { staffPinSchema } from '../staff/staff.js';

export const orderApprovalSchema = z.object({
  membershipId: z.uuid(),
  pin: staffPinSchema,
});

export type OrderApproval = z.infer<typeof orderApprovalSchema>;
