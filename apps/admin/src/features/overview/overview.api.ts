import { adminOverviewSchema, type AdminOverview } from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

export const overviewApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOverview: builder.query<AdminOverview, undefined>({
      query: () => '/v1/admin/overview',
      transformResponse: (response: unknown) => adminOverviewSchema.parse(response),
      providesTags: ['Overview'],
    }),
  }),
});

export const { useGetOverviewQuery } = overviewApi;
