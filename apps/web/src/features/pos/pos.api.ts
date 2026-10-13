import {
  pinUserListResponseSchema,
  posMenuPayloadSchema,
  type PinUserListResponse,
  type PosMenuPayload,
} from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

export const posApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPosMenu: builder.query<PosMenuPayload, string>({
      query: (branchId) => `/v1/branches/${branchId}/pos/menu`,
      transformResponse: (response: unknown) => posMenuPayloadSchema.parse(response),
      providesTags: (_result, _err, branchId) => [{ type: 'PosMenu', id: branchId }],
    }),
    listPinUsers: builder.query<PinUserListResponse, string>({
      query: (branchId) => `/v1/branches/${branchId}/pin-users`,
      transformResponse: (response: unknown) => pinUserListResponseSchema.parse(response),
    }),
  }),
});

export const { useGetPosMenuQuery, useListPinUsersQuery } = posApi;
