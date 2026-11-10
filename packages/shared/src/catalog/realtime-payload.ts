import { z } from 'zod';

/** Socket event name on namespace /rt. A hint only: clients refetch the menu. */
export const CATALOG_UPDATED_EVENT = 'catalog.updated';

export const catalogRealtimePayloadSchema = z.object({
  branchId: z.uuid(),
  /** Milliseconds since epoch when the change was recorded. */
  version: z.number().int().min(1),
});

export type CatalogRealtimePayload = z.infer<typeof catalogRealtimePayloadSchema>;
