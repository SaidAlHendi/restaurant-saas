import { z } from 'zod';

const localizedSnapshotSchema = z.record(z.string(), z.string());

export const cartLineSchema = z.object({
  localId: z.uuid(),
  productId: z.uuid(),
  nameSnapshot: localizedSnapshotSchema,
  unitPriceMinor: z.number().int(),
  modifierIds: z.array(z.uuid()),
  modifierNames: z.record(z.string(), localizedSnapshotSchema),
  quantity: z.number().int().min(1).max(999),
  note: z.string(),
});

export const cartStateSchema = z.object({
  branchId: z.uuid(),
  clientOrderId: z.uuid(),
  orderType: z.enum(['dine_in', 'takeaway']),
  tableId: z.uuid().nullable(),
  customerName: z.string(),
  orderNote: z.string(),
  lines: z.array(cartLineSchema),
});

export type StoredCartState = z.infer<typeof cartStateSchema>;
