import type { AdminLoginBody, AdminMeResponse } from '@app/shared';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, 'API_UNREACHABLE');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { code?: string };
    throw new ApiError(res.status, body.code ?? 'UNKNOWN');
  }
  return (await res.json()) as T;
}

/** Calls go to this app's own /api/auth routes, which hold the session cookies. */
export const authApi = {
  login: (body: AdminLoginBody) =>
    request<AdminMeResponse>('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  me: () => request<AdminMeResponse>('/api/auth/me'),
};
