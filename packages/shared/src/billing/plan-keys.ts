export const PLAN_KEYS = ['free', 'menu', 'restaurant', 'business'] as const;

export type PlanKey = (typeof PLAN_KEYS)[number];

export const PLAN_IDS = {
  free: '00000000-0000-4000-8000-000000001001',
  menu: '00000000-0000-4000-8000-000000001002',
  restaurant: '00000000-0000-4000-8000-000000001003',
  business: '00000000-0000-4000-8000-000000001004',
} as const satisfies Record<PlanKey, string>;
