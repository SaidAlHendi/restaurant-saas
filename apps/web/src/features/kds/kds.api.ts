import {
  changeOrderItemStatusBodySchema,
  changeOrderStatusBodySchema,
  kitchenBoardResponseSchema,
  orderDetailSchema,
  type ChangeOrderItemStatusBody,
  type KitchenBoardResponse,
  type OrderDetail,
} from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

import { withItemReady, withOrderStatus, withServerOrder } from './kds-board.utils.js';

export const kdsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getKitchenBoard: builder.query<KitchenBoardResponse, string>({
      query: (branchId) => `/v1/branches/${branchId}/kitchen/board`,
      transformResponse: (response: unknown) => kitchenBoardResponseSchema.parse(response),
      providesTags: (_result, _error, branchId) => [{ type: 'KitchenBoard', id: branchId }],
    }),
    moveKitchenOrder: builder.mutation<
      OrderDetail,
      { branchId: string; orderId: string; to: 'preparing' | 'ready'; expectedVersion: number }
    >({
      query: ({ branchId, orderId, to, expectedVersion }) => ({
        url: `/v1/branches/${branchId}/orders/${orderId}/status`,
        method: 'POST',
        body: changeOrderStatusBodySchema.parse({ to, expectedVersion }),
      }),
      transformResponse: (response: unknown) => orderDetailSchema.parse(response),
      async onQueryStarted({ branchId, orderId, to }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          kdsApi.util.updateQueryData('getKitchenBoard', branchId, (draft) =>
            withOrderStatus(draft, orderId, to),
          ),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(
            kdsApi.util.updateQueryData('getKitchenBoard', branchId, (draft) =>
              withServerOrder(draft, data),
            ),
          );
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Order', id: arg.orderId },
        { type: 'Order', id: 'LIST' },
      ],
    }),
    changeKitchenItemStatus: builder.mutation<
      OrderDetail,
      { branchId: string; orderId: string; itemId: string; body: ChangeOrderItemStatusBody }
    >({
      query: ({ branchId, orderId, itemId, body }) => ({
        url: `/v1/branches/${branchId}/orders/${orderId}/items/${itemId}/status`,
        method: 'POST',
        body: changeOrderItemStatusBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => orderDetailSchema.parse(response),
      async onQueryStarted({ branchId, orderId, itemId, body }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          kdsApi.util.updateQueryData('getKitchenBoard', branchId, (draft) =>
            withItemReady(draft, orderId, itemId, body.to === 'ready'),
          ),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(
            kdsApi.util.updateQueryData('getKitchenBoard', branchId, (draft) =>
              withServerOrder(draft, data),
            ),
          );
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (_result, _error, arg) => [{ type: 'Order', id: arg.orderId }],
    }),
  }),
});

export const {
  useGetKitchenBoardQuery,
  useMoveKitchenOrderMutation,
  useChangeKitchenItemStatusMutation,
} = kdsApi;
