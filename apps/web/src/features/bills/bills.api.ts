import {
  billPaymentResultSchema,
  billSchema,
  type Bill,
  type BillPaymentResult,
  type BillStatus,
  type CreateBillPaymentBody,
  type MoveOrderTableBody,
} from '@app/shared';
import { z } from 'zod';

import { baseApi } from '../../app/api/base-api.js';

export const billsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listBills: builder.query<Bill[], { branchId: string; status?: BillStatus; tableId?: string }>({
      query: ({ branchId, status = 'open', tableId }) => ({
        url: `/v1/branches/${branchId}/bills`,
        params: { status, tableId },
      }),
      transformResponse: (response: unknown) => z.array(billSchema).parse(response),
      providesTags: [{ type: 'Bill', id: 'LIST' }],
    }),
    payBill: builder.mutation<
      BillPaymentResult,
      { branchId: string; billId: string; body: CreateBillPaymentBody }
    >({
      query: ({ branchId, billId, body }) => ({
        url: `/v1/branches/${branchId}/bills/${billId}/payments`,
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': body.clientPaymentId },
      }),
      transformResponse: (response: unknown) => billPaymentResultSchema.parse(response),
      invalidatesTags: [
        { type: 'Bill', id: 'LIST' },
        { type: 'Order', id: 'LIST' },
      ],
    }),
    moveOrderTable: builder.mutation<
      { orderId: string; tableId: string; billId: string; version: number },
      { branchId: string; orderId: string; body: MoveOrderTableBody }
    >({
      query: ({ branchId, orderId, body }) => ({
        url: `/v1/branches/${branchId}/orders/${orderId}/move-table`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Bill', id: 'LIST' },
        { type: 'Order', id: 'LIST' },
      ],
    }),
    closeBill: builder.mutation<Bill, { branchId: string; billId: string }>({
      query: ({ branchId, billId }) => ({
        url: `/v1/branches/${branchId}/bills/${billId}/close`,
        method: 'POST',
      }),
      transformResponse: (response: unknown) => billSchema.parse(response),
      invalidatesTags: [
        { type: 'Bill', id: 'LIST' },
        { type: 'Order', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListBillsQuery,
  usePayBillMutation,
  useCloseBillMutation,
  useMoveOrderTableMutation,
} = billsApi;
