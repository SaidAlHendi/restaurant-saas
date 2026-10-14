import {
  billingChangePlanBodySchema,
  billingChangePlanResponseSchema,
  billingCheckoutBodySchema,
  billingCheckoutResponseSchema,
  billingOverviewResponseSchema,
  billingPortalResponseSchema,
  type BillingChangePlanBody,
  type BillingChangePlanResponse,
  type BillingCheckoutBody,
  type BillingCheckoutResponse,
  type BillingOverviewResponse,
  type BillingPortalResponse,
} from '@app/shared';

import { baseApi } from '../../app/api/base-api.js';

export const billingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBillingOverview: builder.query<BillingOverviewResponse, undefined>({
      query: () => '/v1/billing',
      transformResponse: (response: unknown) => billingOverviewResponseSchema.parse(response),
      providesTags: [{ type: 'Billing', id: 'CURRENT' }],
    }),
    startCheckout: builder.mutation<BillingCheckoutResponse, BillingCheckoutBody>({
      query: (body) => ({
        url: '/v1/billing/checkout',
        method: 'POST',
        body: billingCheckoutBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => billingCheckoutResponseSchema.parse(response),
    }),
    // The subscription row changes only when Paddle's webhook arrives; the page polls after this.
    changePlan: builder.mutation<BillingChangePlanResponse, BillingChangePlanBody>({
      query: (body) => ({
        url: '/v1/billing/change-plan',
        method: 'POST',
        body: billingChangePlanBodySchema.parse(body),
      }),
      transformResponse: (response: unknown) => billingChangePlanResponseSchema.parse(response),
    }),
    openPortal: builder.mutation<BillingPortalResponse, undefined>({
      query: () => ({
        url: '/v1/billing/portal',
        method: 'POST',
      }),
      transformResponse: (response: unknown) => billingPortalResponseSchema.parse(response),
    }),
  }),
});

export const {
  useGetBillingOverviewQuery,
  useStartCheckoutMutation,
  useChangePlanMutation,
  useOpenPortalMutation,
} = billingApi;
