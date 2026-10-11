import { posMenuPayloadSchema, type PosMenuPayload } from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

export const posApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPosMenu: builder.query<PosMenuPayload, string>({
      query: (branchId) => `/v1/branches/${branchId}/pos/menu`,
      transformResponse: (response: unknown) => posMenuPayloadSchema.parse(response),
      providesTags: (_result, _err, branchId) => [{ type: 'PosMenu', id: branchId }],
    }),
  }),
});

export const { useGetPosMenuQuery } = posApi;
