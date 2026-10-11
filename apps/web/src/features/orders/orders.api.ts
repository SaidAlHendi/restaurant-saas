import {
  createOrderBodySchema,
  orderDetailSchema,
  type CreateOrderBody,
  type OrderDetail,
} from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createOrder: builder.mutation<
      OrderDetail,
      { branchId: string; body: CreateOrderBody; idempotencyKey: string }
    >({
      query: ({ branchId, body, idempotencyKey }) => ({
        url: `/v1/branches/${branchId}/orders`,
        method: 'POST',
        body: createOrderBodySchema.parse(body),
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
      transformResponse: (response: unknown) => orderDetailSchema.parse(response),
      invalidatesTags: [{ type: 'Order', id: 'LIST' }],
    }),
  }),
});

export const { useCreateOrderMutation } = ordersApi;
