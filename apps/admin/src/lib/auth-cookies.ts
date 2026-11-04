import type { NextResponse } from 'next/server';

import { secondsUntilExpiry } from './admin-token';
import {
  ACCESS_COOKIE,
  cookieSecure,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
  REFRESH_TTL_SECONDS,
} from './session-cookies';

export function setAccessCookie(res: NextResponse, token: string): void {
  res.cookies.set(ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'strict',
    path: '/',
    maxAge: secondsUntilExpiry(token),
  });
}

export function setRefreshCookie(res: NextResponse, raw: string): void {
  res.cookies.set(REFRESH_COOKIE, raw, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TTL_SECONDS,
  });
}

export function clearSessionCookies(res: NextResponse): void {
  res.cookies.set(ACCESS_COOKIE, '', { path: '/', maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, '', { path: REFRESH_COOKIE_PATH, maxAge: 0 });
}

/** Reads the raw admin_rt value the API sets on its own path and hands back to us as Set-Cookie. */
export function refreshValueFromApi(res: Response): string | null {
  for (const line of res.headers.getSetCookie()) {
    const match = /^admin_rt=([^;]*)/.exec(line);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }
  return null;
}
