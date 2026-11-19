import {
  adminUserListResponseSchema,
  type AdminUserListQuery,
  type AdminUserListResponse,
} from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listUsers: builder.query<AdminUserListResponse, AdminUserListQuery>({
      query: ({ search, cursor }) => ({
        url: '/v1/admin/users',
        params: { search: search || undefined, cursor },
      }),
      transformResponse: (response: unknown) => adminUserListResponseSchema.parse(response),
    }),
  }),
});

export const { useListUsersQuery } = usersApi;
