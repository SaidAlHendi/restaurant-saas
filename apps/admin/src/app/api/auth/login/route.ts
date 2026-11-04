import type { AdminLoginResponse } from '@app/shared';
import { NextResponse } from 'next/server';

import { refreshValueFromApi } from '@/lib/auth-cookies';
import { applySession } from '@/lib/refresh-session';
import { apiUrl } from '@/lib/session-cookies';

export const dynamic = 'force-dynamic';

/** Signs in at the API and keeps the session in httpOnly cookies on this origin. */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_REQUEST' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${apiUrl()}/v1/admin/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': request.headers.get('user-agent') ?? 'sahtain-admin',
        'x-forwarded-for': request.headers.get('x-forwarded-for') ?? '',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ code: 'API_UNREACHABLE' }, { status: 502 });
  }

  if (!upstream.ok) {
    // Pass the API status through (401 invalid credentials, 429 throttled), never its body.
    return NextResponse.json({ code: upstream.status === 429 ? 'THROTTLED' : 'INVALID_CREDENTIALS' }, {
      status: upstream.status === 429 ? 429 : upstream.status >= 500 ? 502 : 401,
    });
  }

  const data = (await upstream.json()) as AdminLoginResponse;
  const refresh = refreshValueFromApi(upstream);
  if (!refresh) {
    return NextResponse.json({ code: 'API_UNREACHABLE' }, { status: 502 });
  }
  return applySession(NextResponse.json({ admin: data.admin }), {
    accessToken: data.accessToken,
    refresh,
  });
}
