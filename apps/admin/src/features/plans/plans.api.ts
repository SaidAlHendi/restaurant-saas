import { adminPlanListResponseSchema, type AdminPlanListResponse } from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

export const plansApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listPlans: builder.query<AdminPlanListResponse, undefined>({
      query: () => '/v1/admin/plans',
      transformResponse: (response: unknown) => adminPlanListResponseSchema.parse(response),
    }),
  }),
});

export const { useListPlansQuery } = plansApi;
