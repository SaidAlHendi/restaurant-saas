import {
  adminOrgActivateResultSchema,
  adminOrgDetailSchema,
  adminOrgListResponseSchema,
  adminOrgStatusChangeSchema,
  type AdminOrgActivateInput,
  type AdminOrgActivateResult,
  type AdminOrgDetail,
  type AdminOrgListQuery,
  type AdminOrgListResponse,
  type AdminOrgStatusChange,
} from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

export type RestaurantListArgs = Pick<AdminOrgListQuery, 'q' | 'status' | 'page' | 'pageSize'>;

export const restaurantsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listRestaurants: builder.query<AdminOrgListResponse, RestaurantListArgs>({
      query: ({ q, status, page, pageSize }) => ({
        url: '/v1/admin/orgs',
        params: { q: q || undefined, status, page, pageSize },
      }),
      transformResponse: (response: unknown) => adminOrgListResponseSchema.parse(response),
      providesTags: [{ type: 'Restaurant', id: 'LIST' }],
    }),
    getRestaurant: builder.query<AdminOrgDetail, string>({
      query: (id) => `/v1/admin/orgs/${encodeURIComponent(id)}`,
      transformResponse: (response: unknown) => adminOrgDetailSchema.parse(response),
      providesTags: (_result, _error, id) => [{ type: 'Restaurant', id }],
    }),
    suspendRestaurant: builder.mutation<AdminOrgStatusChange, string>({
      query: (id) => ({ url: `/v1/admin/orgs/${encodeURIComponent(id)}/suspend`, method: 'POST' }),
      transformResponse: (response: unknown) => adminOrgStatusChangeSchema.parse(response),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Restaurant', id },
        { type: 'Restaurant', id: 'LIST' },
      ],
    }),
    reactivateRestaurant: builder.mutation<AdminOrgStatusChange, string>({
      query: (id) => ({
        url: `/v1/admin/orgs/${encodeURIComponent(id)}/reactivate`,
        method: 'POST',
      }),
      transformResponse: (response: unknown) => adminOrgStatusChangeSchema.parse(response),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Restaurant', id },
        { type: 'Restaurant', id: 'LIST' },
      ],
    }),
    activateRestaurant: builder.mutation<
      AdminOrgActivateResult,
      { id: string } & AdminOrgActivateInput
    >({
      query: ({ id, ...body }) => ({
        url: `/v1/admin/orgs/${encodeURIComponent(id)}/activate`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) => adminOrgActivateResultSchema.parse(response),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Restaurant', id },
        { type: 'Restaurant', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListRestaurantsQuery,
  useGetRestaurantQuery,
  useSuspendRestaurantMutation,
  useReactivateRestaurantMutation,
  useActivateRestaurantMutation,
} = restaurantsApi;
