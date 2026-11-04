import type { AdminRefreshResponse } from '@app/shared';
import { NextResponse } from 'next/server';

import { refreshValueFromApi, setAccessCookie, setRefreshCookie } from './auth-cookies';
import { apiUrl } from './session-cookies';

/** Rotates the session at the API. Returns the new access token and refresh value, or null. */
export async function refreshAtApi(
  refresh: string,
): Promise<{ accessToken: string; refresh: string } | null> {
  try {
    const upstream = await fetch(`${apiUrl()}/v1/admin/auth/refresh`, {
      method: 'POST',
      headers: { cookie: `admin_rt=${encodeURIComponent(refresh)}` },
      cache: 'no-store',
    });
    if (!upstream.ok) return null;
    const body = (await upstream.json()) as AdminRefreshResponse;
    const next = refreshValueFromApi(upstream);
    return next ? { accessToken: body.accessToken, refresh: next } : null;
  } catch {
    return null;
  }
}

export function applySession(
  res: NextResponse,
  session: { accessToken: string; refresh: string },
): NextResponse {
  setAccessCookie(res, session.accessToken);
  setRefreshCookie(res, session.refresh);
  return res;
}
