import { useCallback, useEffect } from 'react';

import type { BillingCheckoutResponse } from '@app/shared';

import {
  checkoutOpenOptions,
  loadPaddle,
  paddleConfigFromEnv,
  setPaddleCheckoutListener,
} from '../paddle-js.js';

const paddleConfig = paddleConfigFromEnv(import.meta.env);

/** Opens Paddle's overlay checkout; `onCompleted` runs after a successful payment. */
export function usePaddleCheckout(uiLocale: string) {
  useEffect(
    () => () => {
      setPaddleCheckoutListener(null);
    },
    [],
  );

  const openCheckout = useCallback(
    async (payload: BillingCheckoutResponse, onCompleted: () => void): Promise<void> => {
      if (paddleConfig === null) {
        throw new Error('Paddle client token is not configured');
      }
      const paddle = await loadPaddle(paddleConfig);
      setPaddleCheckoutListener((event) => {
        if (event === 'completed') {
          onCompleted();
        }
      });
      paddle.Checkout.open(checkoutOpenOptions(payload, uiLocale));
    },
    [uiLocale],
  );

  return { available: paddleConfig !== null, openCheckout };
}
