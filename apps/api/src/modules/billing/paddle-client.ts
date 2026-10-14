export type PaddleUpdateSubscriptionBody = {
  items: Array<{ price_id: string; quantity: number }>;
  proration_billing_mode: 'prorated_immediately';
  scheduled_change?: null;
};

export type PaddleCancelSubscriptionBody = {
  effective_from: 'next_billing_period';
};

export interface PaddleClient {
  updateSubscription(
    subscriptionId: string,
    body: PaddleUpdateSubscriptionBody,
  ): Promise<void>;
  cancelSubscriptionAtPeriodEnd(
    subscriptionId: string,
    body: PaddleCancelSubscriptionBody,
  ): Promise<void>;
  createCustomerPortalSession(customerId: string): Promise<{ url: string }>;
}

export class PaddleProviderError extends Error {
  constructor(
    message: string,
    public readonly paddleErrorCode: string | null,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'PaddleProviderError';
  }
}
