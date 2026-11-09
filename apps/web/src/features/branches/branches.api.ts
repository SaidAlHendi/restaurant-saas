import {
  branchListResponseSchema,
  branchSchema,
  createBranchBodySchema,
  patchBranchBodySchema,
  type CreateBranchBody,
  type Branch,
  type PatchBranchBody,
} from '@app/shared';

import type { AppDispatch } from '../../app/store.js';
import { refreshSessionFromMe } from '../session/refresh-session-from-me.js';
import { baseApi } from '../../app/api/base-api.js';

export const branchesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listBranches: builder.query<{ items: Branch[] }, undefined>({
      query: () => '/v1/branches',
      transformResponse: (response: unknown) => branchListResponseSchema.parse(response),
      providesTags: [{ type: 'Branch', id: 'LIST' }],
    }),
    createBranch: builder.mutation<Branch, CreateBranchBody>({
      query: (body) => ({
        url: '/v1/branches',
        method: 'POST',
        body: createBranchBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => branchSchema.parse(response),
      invalidatesTags: [{ type: 'Branch', id: 'LIST' }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch {
          return;
        }
        await refreshSessionFromMe(dispatch as AppDispatch);
      },
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
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch {
          return;
        }
        await refreshSessionFromMe(dispatch as AppDispatch);
      },
    }),
  }),
});

export const { useCreateBranchMutation, useListBranchesQuery, usePatchBranchMutation } =
  branchesApi;
