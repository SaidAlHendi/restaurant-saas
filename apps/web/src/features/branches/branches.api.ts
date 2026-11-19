import {
  branchListResponseSchema,
  branchSchema,
  branchDisplayLinkSchema,
  createBranchBodySchema,
  patchBranchBodySchema,
  type CreateBranchBody,
  type Branch,
  type BranchDisplayLink,
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
    getBranchDisplayLink: builder.query<BranchDisplayLink, string>({
      query: (branchId) => `/v1/branches/${branchId}/display-link`,
      transformResponse: (response: unknown) => branchDisplayLinkSchema.parse(response),
      providesTags: (_result, _err, branchId) => [{ type: 'Branch', id: `display-${branchId}` }],
    }),
    rotateBranchDisplayLink: builder.mutation<BranchDisplayLink, string>({
      query: (branchId) => ({
        url: `/v1/branches/${branchId}/display-link/rotate`,
        method: 'POST',
      }),
      transformResponse: (response: unknown) => branchDisplayLinkSchema.parse(response),
      invalidatesTags: (_result, _err, branchId) => [{ type: 'Branch', id: `display-${branchId}` }],
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

export const {
  useCreateBranchMutation,
  useGetBranchDisplayLinkQuery,
  useListBranchesQuery,
  usePatchBranchMutation,
  useRotateBranchDisplayLinkMutation,
} = branchesApi;
