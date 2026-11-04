import { jwtVerify } from 'jose';

const AUDIENCE = 'admin';

/** Verifies an admin access token (HS256, aud "admin"). Fails closed: no secret means no session. */
export async function verifyAdminToken(token: string | undefined): Promise<{ exp: number } | null> {
  const secret = process.env.JWT_ADMIN_SECRET;
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      audience: AUDIENCE,
      algorithms: ['HS256'],
    });
    return typeof payload.exp === 'number' ? { exp: payload.exp } : null;
  } catch {
    return null;
  }
}

/** Seconds until the token expires, read without verifying (only used to size the cookie). */
export function secondsUntilExpiry(token: string): number {
  try {
    const part = token.split('.')[1];
    if (!part) return 0;
    const json = JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as { exp?: number };
    return typeof json.exp === 'number' ? Math.max(0, json.exp - Math.floor(Date.now() / 1000)) : 0;
  } catch {
    return 0;
  }
}
