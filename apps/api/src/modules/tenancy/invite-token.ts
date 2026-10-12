import { createHash, randomBytes } from 'node:crypto';

const INVITE_TOKEN_BYTES = 32;

export function generateInviteToken(): { raw: string; hash: string } {
  const raw = randomBytes(INVITE_TOKEN_BYTES).toString('base64url');
  return { raw, hash: hashInviteToken(raw) };
}

export function hashInviteToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function inviteExpiresAt(from: Date): Date {
  return new Date(from.getTime() + INVITE_TTL_MS);
}
