import type { Agent } from 'supertest';

import { authAgent, loginSeedUser } from './factories';

export async function asDemoOwner(agent: Agent) {
  const { accessToken } = await loginSeedUser(agent, 'owner', 'demo');
  return authAgent(agent, accessToken);
}

export async function asDemoKitchen(agent: Agent) {
  const { accessToken } = await loginSeedUser(agent, 'kitchen', 'demo');
  return authAgent(agent, accessToken);
}

export async function asOtherOwner(agent: Agent) {
  const { accessToken } = await loginSeedUser(agent, 'owner', 'other');
  return authAgent(agent, accessToken);
}

export function categoryBody(nameEn = 'Mains', nameAr = 'أطباق') {
  return {
    name: { en: nameEn, ar: nameAr },
    isActive: true,
  };
}

export function productBody(categoryId: string, priceMinor = 1500) {
  return {
    categoryId,
    name: { en: 'Burger', ar: 'برجر' },
    description: { en: 'Tasty', ar: 'لذيذ' },
    priceMinor,
    isActive: true,
  };
}
