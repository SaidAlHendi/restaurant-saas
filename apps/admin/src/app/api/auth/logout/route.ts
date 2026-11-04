import { NextResponse, type NextRequest } from 'next/server';

import { clearSessionCookies } from '@/lib/auth-cookies';
import { apiUrl, REFRESH_COOKIE } from '@/lib/session-cookies';

export const dynamic = 'force-dynamic';

/** Revokes the session at the API, then clears both cookies here (even if the API call fails). */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refresh) {
    try {
      await fetch(`${apiUrl()}/v1/admin/auth/logout`, {
        method: 'POST',
        headers: { cookie: `admin_rt=${encodeURIComponent(refresh)}` },
        cache: 'no-store',
      });
    } catch {
      // Sign out locally even when the API is down.
    }
  }
  const res = NextResponse.json({ ok: true });
  clearSessionCookies(res);
  return res;
}
