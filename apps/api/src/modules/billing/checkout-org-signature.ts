import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Paddle echoes checkout `custom_data` back on webhooks, but the browser can change it.
 * We sign the org id at checkout and only trust webhook org ids whose signature matches.
 */
function digest(secret: string, orgId: string): string {
  return createHmac('sha256', secret).update(`paddle-checkout-org:${orgId}`).digest('base64url');
}

export function signCheckoutOrgId(secret: string, orgId: string): string {
  return digest(secret, orgId);
}

export function verifyCheckoutOrgId(secret: string, orgId: string, sig: unknown): boolean {
  if (typeof sig !== 'string' || sig.length === 0) {
    return false;
  }
  const expected = Buffer.from(digest(secret, orgId));
  const actual = Buffer.from(sig);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
