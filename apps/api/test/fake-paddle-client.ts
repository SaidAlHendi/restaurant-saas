import type {
  PaddleCancelSubscriptionBody,
  PaddleClient,
  PaddleUpdateSubscriptionBody,
} from '../src/modules/billing/paddle-client';

export type FakePaddleUpdateCall = {
  subscriptionId: string;
  body: PaddleUpdateSubscriptionBody;
};

export type FakePaddleCancelCall = {
  subscriptionId: string;
  body: PaddleCancelSubscriptionBody;
};

export type FakePaddlePortalCall = {
  customerId: string;
};

export class FakePaddleClient implements PaddleClient {
  readonly updateCalls: FakePaddleUpdateCall[] = [];
  readonly cancelCalls: FakePaddleCancelCall[] = [];
  readonly portalCalls: FakePaddlePortalCall[] = [];
  portalUrl = 'https://sandbox-paddle.example/portal/test';

  updateSubscription(
    subscriptionId: string,
    body: PaddleUpdateSubscriptionBody,
  ): Promise<void> {
    this.updateCalls.push({ subscriptionId, body });
    return Promise.resolve();
  }

  cancelSubscriptionAtPeriodEnd(
    subscriptionId: string,
    body: PaddleCancelSubscriptionBody,
  ): Promise<void> {
    this.cancelCalls.push({ subscriptionId, body });
    return Promise.resolve();
  }

  createCustomerPortalSession(customerId: string): Promise<{ url: string }> {
    this.portalCalls.push({ customerId });
    return Promise.resolve({ url: this.portalUrl });
  }

  reset(): void {
    this.updateCalls.length = 0;
    this.cancelCalls.length = 0;
    this.portalCalls.length = 0;
  }
}
