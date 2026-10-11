export type LocalizedText = { ar: string; en: string };

export type BranchDef = {
  key: string;
  slug: string;
  name: LocalizedText;
  city: LocalizedText;
  taxInclusive?: boolean;
};

export type CategoryDef = {
  key: string;
  name: LocalizedText;
  sortOrder: number;
  /** Soft-deleted category for demo filters */
  deleted?: boolean;
};

export type ModifierDef = {
  key: string;
  name: LocalizedText;
  priceDeltaMinor: number;
  sortOrder: number;
};

export type ModifierGroupDef = {
  key: string;
  name: LocalizedText;
  minSelect: number;
  maxSelect: number;
  modifiers: ModifierDef[];
};

export type ProductDef = {
  key: string;
  categoryKey: string;
  name: LocalizedText;
  description: LocalizedText;
  priceMinor: number;
  isActive?: boolean;
  /** Override Unsplash search query (English) */
  unsplashQuery?: string;
  /** When set, used instead of PRNG linking */
  modifierGroupKeys?: string[];
};

export type OrgSeedDefinition = {
  slug: string;
  name: LocalizedText;
  defaultLocale: 'ar' | 'en';
  taxInclusive: boolean;
  branches: BranchDef[];
  categories: CategoryDef[];
  modifierGroups: ModifierGroupDef[];
  products: ProductDef[];
};
