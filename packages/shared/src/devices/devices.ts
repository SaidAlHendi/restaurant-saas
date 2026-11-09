import { z } from 'zod';

import { pinLoginBodySchema } from '../auth/pin-login.js';
import { pinUserListItemSchema } from '../staff/pin-users.js';

/** Pairing code alphabet: no 0/O/1/I/L so it can be read out loud or typed from a screen. */
export const PAIRING_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const PAIRING_CODE_LENGTH = 8;

export const posDeviceStatusSchema = z.enum(['pending', 'active', 'revoked']);
export type PosDeviceStatus = z.infer<typeof posDeviceStatusSchema>;

export const createPosDeviceBodySchema = z.object({
  branchId: z.uuid(),
  name: z.string().trim().min(1).max(80),
});
export type CreatePosDeviceBody = z.infer<typeof createPosDeviceBodySchema>;

export const posDeviceListItemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  branchId: z.uuid(),
  branchName: z.string(),
  status: posDeviceStatusSchema,
  pairingExpiresAt: z.iso.datetime().nullable(),
  pairedAt: z.iso.datetime().nullable(),
  lastUsedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type PosDeviceListItem = z.infer<typeof posDeviceListItemSchema>;

export const posDeviceListResponseSchema = z.object({
  items: z.array(posDeviceListItemSchema),
});
export type PosDeviceListResponse = z.infer<typeof posDeviceListResponseSchema>;

export const createPosDeviceResponseSchema = z.object({
  device: posDeviceListItemSchema,
  /** Shown once. Valid for a few minutes and usable a single time. */
  pairingCode: z.string(),
});
export type CreatePosDeviceResponse = z.infer<typeof createPosDeviceResponseSchema>;

export const pairPosDeviceBodySchema = z.object({
  code: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s-]/g, '').toUpperCase())
    .pipe(z.string().length(PAIRING_CODE_LENGTH)),
});
export type PairPosDeviceBody = z.infer<typeof pairPosDeviceBodySchema>;

export const pairPosDeviceResponseSchema = z.object({
  deviceKey: z.string(),
  device: z.object({
    id: z.uuid(),
    name: z.string(),
    branchName: z.string(),
    orgName: z.string(),
  }),
});
export type PairPosDeviceResponse = z.infer<typeof pairPosDeviceResponseSchema>;

export const devicePinUsersBodySchema = z.object({
  deviceKey: z.string().min(16).max(256),
});
export type DevicePinUsersBody = z.infer<typeof devicePinUsersBodySchema>;

export const devicePinUsersResponseSchema = z.object({
  device: z.object({
    id: z.uuid(),
    name: z.string(),
    branchName: z.string(),
    orgName: z.string(),
  }),
  items: z.array(pinUserListItemSchema),
});
export type DevicePinUsersResponse = z.infer<typeof devicePinUsersResponseSchema>;

export const devicePinLoginBodySchema = pinLoginBodySchema.extend({
  deviceKey: z.string().min(16).max(256),
});
export type DevicePinLoginBody = z.infer<typeof devicePinLoginBodySchema>;
