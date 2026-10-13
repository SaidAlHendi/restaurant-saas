import { z } from 'zod';

import { staffPinSchema } from '../staff/staff.js';

export const pinLoginBodySchema = z.object({
  membershipId: z.uuid(),
  pin: staffPinSchema,
});

export type PinLoginBody = z.infer<typeof pinLoginBodySchema>;
