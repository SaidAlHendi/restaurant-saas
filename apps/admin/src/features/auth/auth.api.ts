import {
  adminLoginBodySchema,
  adminLoginResponseSchema,
  adminMeResponseSchema,
  adminRefreshResponseSchema,
  type AdminLoginBody,
  type AdminMeResponse,
  type AdminRefreshResponse,
} from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (body: AdminLoginBody) => ({
        url: '/v1/admin/auth/login',
        method: 'POST',
        body: adminLoginBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => adminLoginResponseSchema.parse(response),
    }),
    refresh: builder.mutation<AdminRefreshResponse, undefined>({
      query: () => ({ url: '/v1/admin/auth/refresh', method: 'POST' }),
      transformResponse: (response: unknown) => adminRefreshResponseSchema.parse(response),
    }),
    logout: builder.mutation<undefined, undefined>({
      query: () => ({ url: '/v1/admin/auth/logout', method: 'POST' }),
    }),
    getMe: builder.query<AdminMeResponse, undefined>({
      query: () => '/v1/admin/me',
      providesTags: ['Me'],
      transformResponse: (response: unknown) => adminMeResponseSchema.parse(response),
    }),
  }),
});

export const { useLoginMutation, useRefreshMutation, useLogoutMutation, useGetMeQuery } = authApi;
