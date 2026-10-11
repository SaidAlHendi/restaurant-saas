/** CI / test seed orgs — never touch in demo seed. */
export const PROTECTED_ORG_IDS = new Set<string>([
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000202',
]);

export const SEED_ORG_SLUG_PREFIX = 'seed-';

export const SEED_USER_EMAIL_SUFFIX = '.seed.local';

export const DEMO_SEED_NAMESPACE = 'restaurant-saas-demo-seed-v1';
