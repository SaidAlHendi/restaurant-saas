import {
  adminOrgDetailSchema,
  adminOrgListResponseSchema,
  type AdminOrgDetail,
  type AdminOrgListQuery,
  type AdminOrgListResponse,
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
    }),
    getRestaurant: builder.query<AdminOrgDetail, string>({
      query: (id) => `/v1/admin/orgs/${encodeURIComponent(id)}`,
      transformResponse: (response: unknown) => adminOrgDetailSchema.parse(response),
    }),
  }),
});

export const { useListRestaurantsQuery, useGetRestaurantQuery } = restaurantsApi;
