import {
  addOrderItemsBodySchema,
  changeOrderStatusBodySchema,
  createOrderBodySchema,
  createPaymentBodySchema,
  orderDetailSchema,
  orderListResponseSchema,
  paymentSchema,
  voidOrderItemBodySchema,
  type AddOrderItemsBody,
  type ChangeOrderStatusBody,
  type CreateOrderBody,
  type CreatePaymentBody,
  type OrderDetail,
  type OrderListQuery,
  type Payment,
  type VoidOrderItemBody,
} from '@app/shared';
import type { z } from 'zod';

import { baseApi } from '../../app/api/base-api.js';

type OrderListResponse = z.infer<typeof orderListResponseSchema>;

function orderListParams(query: OrderListQuery | undefined): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (query?.limit !== undefined) {
    params['limit'] = query.limit;
  }
  if (query?.cursor !== undefined) {
    params['cursor'] = query.cursor;
  }
  if (query?.status !== undefined) {
    params['status'] = query.status;
  }
  if (query?.businessDate !== undefined) {
    params['businessDate'] = query.businessDate;
  }
  if (query?.activeOnly === true) {
    params['activeOnly'] = 'true';
  } else if (query?.activeOnly === false) {
    params['activeOnly'] = 'false';
  }
  return params;
}

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listOrders: builder.query<
      OrderListResponse,
      { branchId: string; query?: OrderListQuery }
    >({
      query: ({ branchId, query }) => ({
        url: `/v1/branches/${branchId}/orders`,
        params: orderListParams(query),
      }),
      transformResponse: (response: unknown) => orderListResponseSchema.parse(response),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((item) => ({ type: 'Order' as const, id: item.id })),
              { type: 'Order', id: 'LIST' },
            ]
          : [{ type: 'Order', id: 'LIST' }],
    }),
    getOrder: builder.query<OrderDetail, { branchId: string; orderId: string }>({
      query: ({ branchId, orderId }) => `/v1/branches/${branchId}/orders/${orderId}`,
      transformResponse: (response: unknown) => orderDetailSchema.parse(response),
      providesTags: (_result, _error, arg) => [{ type: 'Order', id: arg.orderId }],
    }),
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
    changeOrderStatus: builder.mutation<
      OrderDetail,
      { branchId: string; orderId: string; body: ChangeOrderStatusBody }
    >({
      query: ({ branchId, orderId, body }) => ({
        url: `/v1/branches/${branchId}/orders/${orderId}/status`,
        method: 'POST',
        body: changeOrderStatusBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => orderDetailSchema.parse(response),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Order', id: arg.orderId },
        { type: 'Order', id: 'LIST' },
      ],
    }),
    addOrderItems: builder.mutation<
      OrderDetail,
      { branchId: string; orderId: string; body: AddOrderItemsBody }
    >({
      query: ({ branchId, orderId, body }) => ({
        url: `/v1/branches/${branchId}/orders/${orderId}/items`,
        method: 'POST',
        body: addOrderItemsBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => orderDetailSchema.parse(response),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Order', id: arg.orderId },
        { type: 'Order', id: 'LIST' },
      ],
    }),
    voidOrderItem: builder.mutation<
      OrderDetail,
      { branchId: string; orderId: string; itemId: string; body: VoidOrderItemBody }
    >({
      query: ({ branchId, orderId, itemId, body }) => ({
        url: `/v1/branches/${branchId}/orders/${orderId}/items/${itemId}/void`,
        method: 'POST',
        body: voidOrderItemBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => orderDetailSchema.parse(response),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Order', id: arg.orderId },
        { type: 'Order', id: 'LIST' },
      ],
    }),
    capturePayment: builder.mutation<
      Payment,
      { branchId: string; orderId: string; body: CreatePaymentBody; idempotencyKey: string }
    >({
      query: ({ branchId, orderId, body, idempotencyKey }) => ({
        url: `/v1/branches/${branchId}/orders/${orderId}/payments`,
        method: 'POST',
        body: createPaymentBodySchema.parse(body),
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
      transformResponse: (response: unknown) => paymentSchema.parse(response),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Order', id: arg.orderId },
        { type: 'Order', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListOrdersQuery,
  useGetOrderQuery,
  useCreateOrderMutation,
  useChangeOrderStatusMutation,
  useAddOrderItemsMutation,
  useVoidOrderItemMutation,
  useCapturePaymentMutation,
} = ordersApi;
