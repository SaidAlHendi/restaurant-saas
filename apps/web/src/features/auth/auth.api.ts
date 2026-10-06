import {
  loginBodySchema,
  loginResponseSchema,
  meResponseSchema,
  refreshResponseSchema,
  signupBodySchema,
  signupResponseSchema,
  switchOrgBodySchema,
  switchOrgResponseSchema,
  type LoginBody,
  type MeResponse,
  type RefreshResponse,
  type SignupBody,
  type SwitchOrgBody,
} from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (body: LoginBody) => ({
        url: '/v1/auth/login',
        method: 'POST',
        body: loginBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => loginResponseSchema.parse(response),
    }),
    signup: builder.mutation({
      query: (body: SignupBody) => ({
        url: '/v1/auth/signup',
        method: 'POST',
        body: signupBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => signupResponseSchema.parse(response),
    }),
    refresh: builder.mutation<RefreshResponse, undefined>({
      query: () => ({
        url: '/v1/auth/refresh',
        method: 'POST',
      }),
      transformResponse: (response: unknown) => refreshResponseSchema.parse(response),
    }),
    logout: builder.mutation<undefined, undefined>({
      query: () => ({
        url: '/v1/auth/logout',
        method: 'POST',
      }),
    }),
    getMe: builder.query<MeResponse, undefined>({
      query: () => '/v1/me',
      providesTags: ['Me'],
      transformResponse: (response: unknown) => meResponseSchema.parse(response),
    }),
    switchOrg: builder.mutation({
      query: (body: SwitchOrgBody) => ({
        url: '/v1/auth/switch-org',
        method: 'POST',
        body: switchOrgBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => switchOrgResponseSchema.parse(response),
      invalidatesTags: ['Me'],
    }),
  }),
});

export const {
  useLoginMutation,
  useSignupMutation,
  useRefreshMutation,
  useLogoutMutation,
  useGetMeQuery,
  useSwitchOrgMutation,
} = authApi;
