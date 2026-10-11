import { baitShamiOrg } from './bait-shami';
import { burgerLabOrg } from './burger-lab';
import { cafeQahwaOrg } from './cafe-qahwa';
import { pizzaFornoOrg } from './pizza-forno';
import type { OrgSeedDefinition } from './types';

export const ALL_ORG_DEFINITIONS: OrgSeedDefinition[] = [
  baitShamiOrg,
  burgerLabOrg,
  cafeQahwaOrg,
  pizzaFornoOrg,
];

export function productGlobalKey(orgSlug: string, productKey: string): string {
  return `${orgSlug}:${productKey}`;
}

export function allProductGlobalKeys(): string[] {
  const keys: string[] = [];
  for (const org of ALL_ORG_DEFINITIONS) {
    for (const product of org.products) {
      keys.push(productGlobalKey(org.slug, product.key));
    }
  }
  return keys;
}
