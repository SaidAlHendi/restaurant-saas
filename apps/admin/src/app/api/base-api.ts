import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';

import { adminRefreshResponseSchema } from '@app/shared';

import { clearSession, setAccessToken } from '../../features/session/session.slice.js';
import { selectAccessToken } from '../../features/session/session.selectors.js';
import { runAuthRefresh } from '../../lib/auth-refresh-lock.js';
import type { RootState } from '../store.js';

export function apiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  return fromEnv && fromEnv.length > 0 ? fromEnv : 'http://localhost:3000';
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: apiBaseUrl(),
  // The admin refresh cookie (admin_rt) is httpOnly and scoped to /v1/admin/auth.
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = selectAccessToken(getState() as RootState);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

function isAuthUrl(url: string): boolean {
  return url.includes('/v1/admin/auth/');
}

async function performRefresh(api: {
  dispatch: (action: unknown) => unknown;
}): Promise<string | null> {
  const response = await fetch(`${apiBaseUrl()}/v1/admin/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    api.dispatch(clearSession());
    return null;
  }
  const parsed = adminRefreshResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    api.dispatch(clearSession());
    return null;
  }
  api.dispatch(setAccessToken(parsed.data.accessToken));
  return parsed.data.accessToken;
}

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status !== 401) {
    return result;
  }
  const url = typeof args === 'string' ? args : args.url;
  if (isAuthUrl(url)) {
    return result;
  }
  const newToken = await runAuthRefresh(() => performRefresh(api));
  if (!newToken) {
    return result;
  }
  result = await rawBaseQuery(args, api, extraOptions);
  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Me', 'Restaurant'],
  endpoints: () => ({}),
});
