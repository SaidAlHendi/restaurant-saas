import {
  adminUserListResponseSchema,
  type AdminUserListQuery,
  type AdminUserListResponse,
} from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

export type UserListArgs = Pick<AdminUserListQuery, 'search' | 'page'>;

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listUsers: builder.query<AdminUserListResponse, UserListArgs>({
      query: ({ search, page }) => ({
        url: '/v1/admin/users',
        params: { search: search || undefined, page },
      }),
      transformResponse: (response: unknown) => adminUserListResponseSchema.parse(response),
    }),
  }),
});

export const { useListUsersQuery } = usersApi;
