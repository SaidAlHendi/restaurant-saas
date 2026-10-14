import { PaddleProviderError, type PaddleClient } from './paddle-client';

/** Bound when PADDLE_API_KEY is unset: every call fails as a provider error (502). */
export class DisabledPaddleClient implements PaddleClient {
  updateSubscription(): Promise<void> {
    return Promise.reject(notConfigured());
  }

  cancelSubscriptionAtPeriodEnd(): Promise<void> {
    return Promise.reject(notConfigured());
  }

  createCustomerPortalSession(): Promise<{ url: string }> {
    return Promise.reject(notConfigured());
  }
}

function notConfigured(): PaddleProviderError {
  return new PaddleProviderError('Paddle is not configured', null, 502);
}
