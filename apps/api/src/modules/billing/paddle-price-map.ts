import type { PlanKey } from '@app/shared';
import { PLAN_IDS } from '@app/shared';

import type { Env } from '../../config/env';

export type PaddlePriceMap = {
  menu: string | null;
  restaurant: string | null;
  business: string | null;
};

export function paddlePriceMapFromEnv(env: Env): PaddlePriceMap {
  return {
    menu: env.PADDLE_PRICE_MENU ?? null,
    restaurant: env.PADDLE_PRICE_RESTAURANT ?? null,
    business: env.PADDLE_PRICE_BUSINESS ?? null,
  };
}

export function isCheckoutEnabled(env: Env): boolean {
  return (
    env.PADDLE_API_KEY !== undefined &&
    env.PADDLE_PRICE_MENU !== undefined &&
    env.PADDLE_PRICE_RESTAURANT !== undefined &&
    env.PADDLE_PRICE_BUSINESS !== undefined
  );
}

export function priceIdForPlanKey(map: PaddlePriceMap, planKey: PlanKey): string | null {
  if (planKey === 'free') {
    return null;
  }
  return map[planKey];
}

export function planKeyForPriceId(map: PaddlePriceMap, priceId: string): PlanKey | null {
  if (map.menu === priceId) {
    return 'menu';
  }
  if (map.restaurant === priceId) {
    return 'restaurant';
  }
  if (map.business === priceId) {
    return 'business';
  }
  return null;
}

export function planIdForPlanKey(planKey: Exclude<PlanKey, 'free'>): string {
  return PLAN_IDS[planKey];
}
