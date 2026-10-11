import type { LocalizedText, ProductDef } from './types';

export function productLine(
  key: string,
  categoryKey: string,
  name: LocalizedText,
  description: LocalizedText,
  priceMinor: number,
  opts?: { isActive?: boolean; unsplashQuery?: string; modifierGroupKeys?: string[] },
): ProductDef {
  return {
    key,
    categoryKey,
    name,
    description,
    priceMinor,
    isActive: opts?.isActive ?? true,
    unsplashQuery: opts?.unsplashQuery,
    modifierGroupKeys: opts?.modifierGroupKeys,
  };
}
