import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';

import { refreshResponseSchema } from '@app/shared';

import type { RootState } from '../store.js';
import { setAccessToken, clearSession } from '../../features/session/session.slice.js';
import { selectAccessToken, selectCurrentBranchId } from '../../features/session/session.selectors.js';
import { runAuthRefresh } from '../../lib/auth-refresh-lock.js';

function apiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  return fromEnv && fromEnv.length > 0 ? fromEnv : 'http://localhost:3000';
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: apiBaseUrl(),
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = selectAccessToken(state);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const branchId = selectCurrentBranchId(state);
    if (branchId) {
      headers.set('X-Branch-Id', branchId);
    }
    return headers;
  },
});

function isAuthRefreshUrl(url: string): boolean {
  return url.includes('/v1/auth/refresh') || url.includes('/v1/auth/login') || url.includes('/v1/auth/signup');
}

async function performRefresh(api: {
  dispatch: (action: unknown) => unknown;
}): Promise<string | null> {
  const response = await fetch(`${apiBaseUrl()}/v1/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    api.dispatch(clearSession());
    return null;
  }
  const json: unknown = await response.json();
  const parsed = refreshResponseSchema.safeParse(json);
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
  if (isAuthRefreshUrl(url)) {
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
  tagTypes: ['Health', 'Me'],
  endpoints: (builder) => ({
    getHealth: builder.query<{ status: string }, undefined>({
      query: () => '/v1/health',
      providesTags: ['Health'],
    }),
  }),
});

export const { useGetHealthQuery } = baseApi;
