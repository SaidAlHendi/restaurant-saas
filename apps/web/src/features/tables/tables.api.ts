import { z } from 'zod';

import {
  createDiningTableBodySchema,
  diningTableSchema,
  diningTableWithTokenSchema,
  patchDiningTableBodySchema,
  type CreateDiningTableBody,
  type PatchDiningTableBody,
} from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';
import type { DiningTableListItem } from './tables.types.js';

export type { DiningTableListItem } from './tables.types.js';

const diningTableListItemSchema = diningTableSchema.extend({
  qrToken: z.string().optional(),
});

const diningTableListResponseSchema = z.object({
  items: z.array(diningTableListItemSchema),
});

export const tablesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listDiningTables: builder.query<{ items: DiningTableListItem[] }, string>({
      query: (branchId) => `/v1/branches/${branchId}/tables`,
      transformResponse: (response: unknown) => diningTableListResponseSchema.parse(response),
      providesTags: (result, _err, branchId) =>
        result
          ? [
              ...result.items.map((item) => ({ type: 'DiningTable' as const, id: item.id })),
              { type: 'DiningTable', id: `LIST-${branchId}` },
            ]
          : [{ type: 'DiningTable', id: `LIST-${branchId}` }],
    }),
    createDiningTable: builder.mutation<
      z.infer<typeof diningTableWithTokenSchema>,
      { branchId: string; body: CreateDiningTableBody }
    >({
      query: ({ branchId, body }) => ({
        url: `/v1/branches/${branchId}/tables`,
        method: 'POST',
        body: createDiningTableBodySchema.parse(body),
      }),
      invalidatesTags: (_res, _err, { branchId }) => [{ type: 'DiningTable', id: `LIST-${branchId}` }],
    }),
    patchDiningTable: builder.mutation<
      z.infer<typeof diningTableSchema>,
      { branchId: string; tableId: string; body: PatchDiningTableBody }
    >({
      query: ({ branchId, tableId, body }) => ({
        url: `/v1/branches/${branchId}/tables/${tableId}`,
        method: 'PATCH',
        body: patchDiningTableBodySchema.parse(body),
      }),
      invalidatesTags: (_res, _err, { branchId, tableId }) => [
        { type: 'DiningTable', id: tableId },
        { type: 'DiningTable', id: `LIST-${branchId}` },
      ],
    }),
    rotateTableQr: builder.mutation<
      z.infer<typeof diningTableWithTokenSchema>,
      { branchId: string; tableId: string }
    >({
      query: ({ branchId, tableId }) => ({
        url: `/v1/branches/${branchId}/tables/${tableId}/rotate-qr`,
        method: 'POST',
      }),
      invalidatesTags: (_res, _err, { branchId, tableId }) => [
        { type: 'DiningTable', id: tableId },
        { type: 'DiningTable', id: `LIST-${branchId}` },
      ],
    }),
  }),
});

export const {
  useListDiningTablesQuery,
  useCreateDiningTableMutation,
  usePatchDiningTableMutation,
  useRotateTableQrMutation,
} = tablesApi;
