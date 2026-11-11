import { publicDisplayPayloadSchema, type PublicDisplayPayload } from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

export const pickupDisplayApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPickupDisplay: builder.query<PublicDisplayPayload, string>({
      query: (token) => `/v1/public/display/${encodeURIComponent(token)}`,
      transformResponse: (response: unknown) => publicDisplayPayloadSchema.parse(response),
    }),
  }),
});

export const { useGetPickupDisplayQuery } = pickupDisplayApi;
