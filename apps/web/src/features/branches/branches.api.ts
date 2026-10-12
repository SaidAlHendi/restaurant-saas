import {
  branchListResponseSchema,
  branchSchema,
  patchBranchBodySchema,
  type Branch,
  type PatchBranchBody,
} from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

export const branchesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listBranches: builder.query<{ items: Branch[] }, undefined>({
      query: () => '/v1/branches',
      transformResponse: (response: unknown) => branchListResponseSchema.parse(response),
      providesTags: [{ type: 'Branch', id: 'LIST' }],
    }),
    patchBranch: builder.mutation<Branch, { branchId: string; body: PatchBranchBody }>({
      query: ({ branchId, body }) => ({
        url: `/v1/branches/${branchId}`,
        method: 'PATCH',
        body: patchBranchBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => branchSchema.parse(response),
      invalidatesTags: (_result, _err, arg) => [
        { type: 'Branch', id: 'LIST' },
        { type: 'Branch', id: arg.branchId },
        { type: 'PosMenu', id: arg.branchId },
      ],
    }),
  }),
});

export const { useListBranchesQuery, usePatchBranchMutation } = branchesApi;
