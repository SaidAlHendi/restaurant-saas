import { NextResponse, type NextRequest } from 'next/server';

import { clearSessionCookies } from '@/lib/auth-cookies';
import { applySession, refreshAtApi } from '@/lib/refresh-session';
import { REFRESH_COOKIE, safeNextPath } from '@/lib/session-cookies';

export const dynamic = 'force-dynamic';

/**
 * GET is the middleware's landing spot when the access token has expired: rotate the session and
 * go back to the page. POST is the same rotation for fetch calls.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const next = safeNextPath(request.nextUrl.searchParams.get('next'));
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  const session = refresh ? await refreshAtApi(refresh) : null;
  if (!session) {
    const res = NextResponse.redirect(new URL('/login', request.url));
    clearSessionCookies(res);
    return res;
  }
  return applySession(NextResponse.redirect(new URL(next, request.url)), session);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  const session = refresh ? await refreshAtApi(refresh) : null;
  if (!session) {
    const res = NextResponse.json({ code: 'REFRESH_INVALID' }, { status: 401 });
    clearSessionCookies(res);
    return res;
  }
  return applySession(NextResponse.json({ ok: true }), session);
}
