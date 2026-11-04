import { NextResponse, type NextRequest } from 'next/server';

import { verifyAdminToken } from '@/lib/admin-token';
import { ACCESS_COOKIE, apiUrl } from '@/lib/session-cookies';

export const dynamic = 'force-dynamic';

/** The signed-in admin, read from the API with the session cookie as a bearer token. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!(await verifyAdminToken(token))) {
    return NextResponse.json({ code: 'UNAUTHENTICATED' }, { status: 401 });
  }
  try {
    const upstream = await fetch(`${apiUrl()}/v1/admin/me`, {
      headers: { authorization: `Bearer ${token ?? ''}` },
      cache: 'no-store',
    });
    if (!upstream.ok) {
      return NextResponse.json({ code: 'UNAUTHENTICATED' }, { status: upstream.status === 403 ? 403 : 401 });
    }
    return NextResponse.json(await upstream.json());
  } catch {
    return NextResponse.json({ code: 'API_UNREACHABLE' }, { status: 502 });
  }
}
