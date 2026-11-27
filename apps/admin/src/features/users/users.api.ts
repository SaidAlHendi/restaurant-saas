import {
  adminUserListResponseSchema,
  type AdminUserListQuery,
  type AdminUserListResponse,
} from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

export type UserListArgs = Pick<
  AdminUserListQuery,
  'search' | 'page' | 'role' | 'orgId' | 'branchId'
>;

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listUsers: builder.query<AdminUserListResponse, UserListArgs>({
      query: ({ search, ...params }) => ({
        url: '/v1/admin/users',
        params: { ...params, search: search || undefined },
      }),
      transformResponse: (response: unknown) => adminUserListResponseSchema.parse(response),
    }),
  }),
});

export const { useListUsersQuery } = usersApi;
