import { publicDisplayPayloadSchema, type PublicDisplayPayload } from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

export const pickupDisplayApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPickupDisplay: builder.query<PublicDisplayPayload, { orgSlug: string; branchSlug: string }>({
      query: ({ orgSlug, branchSlug }) =>
        `/v1/public/display/${encodeURIComponent(orgSlug)}/${encodeURIComponent(branchSlug)}`,
      transformResponse: (response: unknown) => publicDisplayPayloadSchema.parse(response),
    }),
  }),
});

export const { useGetPickupDisplayQuery } = pickupDisplayApi;
