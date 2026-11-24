import { z } from 'zod';

/**
 * Socket event name on namespace /rt. Tells every open screen of a restaurant that some data it may
 * show has changed, so it refetches that data (the event is only a hint and carries no values).
 */
export const DATA_CHANGED_EVENT = 'data.changed';

export const DATA_CHANGED_SCOPES = [
  /** Dining tables: created, renamed, disabled, QR rotated. */
  'tables',
  /** Restaurant settings: name, languages, currency, menu look, logo. */
  'settings',
  /** Branch settings: tax, payment options, pager, display link. */
  'branch',
  /** Staff: members, roles, PINs, per-employee permissions. */
  'staff',
  /** POS devices. */
  'devices',
  /** Plan or subscription: features and limits changed. */
  'plan',
] as const;

export const dataChangedScopeSchema = z.enum(DATA_CHANGED_SCOPES);
export type DataChangedScope = z.infer<typeof dataChangedScopeSchema>;

export const dataChangedPayloadSchema = z.object({
  scope: dataChangedScopeSchema,
  branchId: z.uuid(),
  /** Milliseconds since epoch when the change was recorded. */
  version: z.number().int().min(1),
});

export type DataChangedPayload = z.infer<typeof dataChangedPayloadSchema>;
