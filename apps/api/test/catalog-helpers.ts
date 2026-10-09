import fs from 'node:fs';
import path from 'node:path';

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

export function walkStorageFiles(root: string): string[] {
  if (!fs.existsSync(root)) {
    return [];
  }
  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(root, entry.name);
    return entry.isDirectory() ? walkStorageFiles(full) : [full];
  });
}

export function webpFilesForProduct(orgId: string, productId: string): string[] {
  const storageRoot = process.env['STORAGE_LOCAL_ROOT'] ?? path.join(process.cwd(), '.storage');
  const root = path.join(storageRoot, 'orgs', orgId, 'products', productId);
  return walkStorageFiles(root).filter((f) => f.endsWith('.webp'));
}
