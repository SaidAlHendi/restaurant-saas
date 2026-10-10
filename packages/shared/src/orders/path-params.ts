import { z } from 'zod';

export const branchIdParamSchema = z.object({
  branchId: z.uuid(),
});

export const orderIdParamSchema = branchIdParamSchema.extend({
  orderId: z.uuid(),
});

export const orderItemIdParamSchema = orderIdParamSchema.extend({
  itemId: z.uuid(),
});

export const tableIdParamSchema = branchIdParamSchema.extend({
  tableId: z.uuid(),
});
