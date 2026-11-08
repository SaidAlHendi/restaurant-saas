import {
  adminSubscriptionListResponseSchema,
  type AdminSubscriptionListQuery,
  type AdminSubscriptionListResponse,
} from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

export type SubscriptionListArgs = Pick<
  AdminSubscriptionListQuery,
  'status' | 'plan' | 'trialEnding'
>;

export const subscriptionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listSubscriptions: builder.query<AdminSubscriptionListResponse, SubscriptionListArgs>({
      query: ({ status, plan, trialEnding }) => ({
        url: '/v1/admin/subscriptions',
        params: { status, plan, trialEnding: trialEnding ? 'true' : undefined },
      }),
      transformResponse: (response: unknown) => adminSubscriptionListResponseSchema.parse(response),
    }),
  }),
});

export const { useListSubscriptionsQuery } = subscriptionsApi;
