import type { BillingCheckoutResponse } from '@app/shared';

/** Paddle Billing (v2) overlay checkout. Add `script-src https://cdn.paddle.com` if a CSP is added. */
export const PADDLE_JS_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js';

type PaddleEvent = { name?: string };

type PaddleCheckoutOpenOptions = {
  items: { priceId: string; quantity: number }[];
  customer?: { id: string } | { email: string };
  customData?: Record<string, string>;
  settings?: { displayMode?: 'overlay'; locale?: string };
};

type PaddleGlobal = {
  Environment: { set: (env: 'sandbox' | 'production') => void };
  Initialize: (options: { token: string; eventCallback?: (event: PaddleEvent) => void }) => void;
  Checkout: { open: (options: PaddleCheckoutOpenOptions) => void };
};

declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

export type PaddleConfig = { token: string; environment: 'sandbox' | 'production' };

/** Client token and environment from Vite env; null when checkout is not set up for this build. */
export function paddleConfigFromEnv(env: {
  VITE_PADDLE_CLIENT_TOKEN?: string;
  VITE_PADDLE_ENV?: string;
}): PaddleConfig | null {
  const token = env.VITE_PADDLE_CLIENT_TOKEN?.trim() ?? '';
  if (token.length === 0) {
    return null;
  }
  return {
    token,
    environment: env.VITE_PADDLE_ENV === 'production' ? 'production' : 'sandbox',
  };
}

export type PaddleCheckoutEvent = 'completed' | 'closed';

let paddlePromise: Promise<PaddleGlobal> | null = null;
let eventListener: ((event: PaddleCheckoutEvent) => void) | null = null;

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PADDLE_JS_URL;
    script.async = true;
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      reject(new Error('Paddle.js failed to load'));
    };
    document.head.appendChild(script);
  });
}

/** Loads and initializes Paddle.js once per page (Paddle allows a single Initialize). */
export function loadPaddle(config: PaddleConfig): Promise<PaddleGlobal> {
  paddlePromise ??= loadScript()
    .then(() => {
      const paddle = window.Paddle;
      if (paddle === undefined) {
        throw new Error('Paddle.js did not register');
      }
      paddle.Environment.set(config.environment);
      paddle.Initialize({
        token: config.token,
        eventCallback: (event) => {
          if (event.name === 'checkout.completed') {
            eventListener?.('completed');
          } else if (event.name === 'checkout.closed') {
            eventListener?.('closed');
          }
        },
      });
      return paddle;
    })
    .catch((error: unknown) => {
      // Allow a retry on the next click.
      paddlePromise = null;
      throw error;
    });
  return paddlePromise;
}

/** Only the latest open checkout gets events. */
export function setPaddleCheckoutListener(
  listener: ((event: PaddleCheckoutEvent) => void) | null,
): void {
  eventListener = listener;
}

export function checkoutOpenOptions(
  payload: BillingCheckoutResponse,
  uiLocale: string,
): PaddleCheckoutOpenOptions {
  return {
    items: [{ priceId: payload.priceId, quantity: payload.quantity }],
    customer:
      payload.customerId !== undefined ? { id: payload.customerId } : { email: payload.customerEmail },
    customData: payload.customData,
    settings: { displayMode: 'overlay', locale: uiLocale.startsWith('ar') ? 'ar' : 'en' },
  };
}
