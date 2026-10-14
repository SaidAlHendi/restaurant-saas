import { Inject, Injectable, Logger } from '@nestjs/common';

import { ENV, type Env } from '../../config/config.module';

import {
  PaddleProviderError,
  type PaddleCancelSubscriptionBody,
  type PaddleClient,
  type PaddleUpdateSubscriptionBody,
} from './paddle-client';

@Injectable()
export class HttpPaddleClient implements PaddleClient {
  private readonly logger = new Logger(HttpPaddleClient.name);
  private readonly baseUrl: string;

  constructor(@Inject(ENV) private readonly env: Env) {
    this.baseUrl =
      env.PADDLE_ENV === 'production'
        ? 'https://api.paddle.com'
        : 'https://api.sandbox.paddle.com';
  }

  async updateSubscription(
    subscriptionId: string,
    body: PaddleUpdateSubscriptionBody,
  ): Promise<void> {
    await this.request('PATCH', `/subscriptions/${subscriptionId}`, body);
  }

  async cancelSubscriptionAtPeriodEnd(
    subscriptionId: string,
    body: PaddleCancelSubscriptionBody,
  ): Promise<void> {
    await this.request('POST', `/subscriptions/${subscriptionId}/cancel`, body);
  }

  async createCustomerPortalSession(customerId: string): Promise<{ url: string }> {
    const data = await this.request<{
      data?: { urls?: { general?: { overview?: string } } };
    }>('POST', `/customers/${customerId}/portal-sessions`, {});
    const url = data.data?.urls?.general?.overview;
    if (url === undefined || url.length === 0) {
      throw new PaddleProviderError('Paddle portal session missing URL', null, 502);
    }
    return { url };
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body: unknown,
  ): Promise<T> {
    const apiKey = this.env.PADDLE_API_KEY;
    if (apiKey === undefined) {
      throw new PaddleProviderError('Paddle API key is not configured', null, 502);
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Paddle request failed';
      this.logger.warn(`Paddle HTTP error: ${method} ${path}`);
      throw new PaddleProviderError(message, null, 502);
    }

    if (response.ok) {
      if (response.status === 204) {
        return undefined as T;
      }
      const parsed: unknown = await response.json();
      return parsed as T;
    }

    let paddleErrorCode: string | null = null;
    try {
      const errBody: unknown = await response.json();
      if (
        errBody !== null &&
        typeof errBody === 'object' &&
        'error' in errBody &&
        errBody.error !== null &&
        typeof errBody.error === 'object' &&
        'code' in errBody.error &&
        typeof errBody.error.code === 'string'
      ) {
        paddleErrorCode = errBody.error.code;
      }
    } catch {
      paddleErrorCode = null;
    }
    this.logger.warn(
      `Paddle non-2xx: ${method} ${path} status=${String(response.status)} code=${paddleErrorCode ?? 'unknown'}`,
    );
    throw new PaddleProviderError(
      'Paddle request failed',
      paddleErrorCode,
      response.status,
    );
  }
}
