export interface MenuCachePurger {
  purgeOrg(orgSlug: string): Promise<void>;
}

export const MENU_CACHE_PURGER = Symbol('MENU_CACHE_PURGER');
