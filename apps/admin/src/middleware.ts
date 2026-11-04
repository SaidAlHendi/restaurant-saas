import { NextResponse, type NextRequest } from 'next/server';

import { verifyAdminToken } from '@/lib/admin-token';
import { ACCESS_COOKIE } from '@/lib/session-cookies';

/**
 * Route protection. Every page needs a valid admin access cookie (verified with JWT_ADMIN_SECRET).
 * A missing or expired access token goes through /api/auth/refresh, which either renews the
 * session and comes back or lands on /login.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  const session = await verifyAdminToken(request.cookies.get(ACCESS_COOKIE)?.value);

  if (pathname === '/login') {
    return session ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next();
  }
  if (session) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ code: 'UNAUTHENTICATED' }, { status: 401 });
  }
  // The refresh cookie is scoped to /api/auth, so pages cannot see it. Let the refresh route look:
  // it rotates the session and returns here, or clears everything and goes to /login.
  const url = new URL('/api/auth/refresh', request.url);
  url.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  // /api/auth/login|refresh|logout are public (they establish or end the session themselves).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|api/auth/login|api/auth/refresh|api/auth/logout).*)',
  ],
};
