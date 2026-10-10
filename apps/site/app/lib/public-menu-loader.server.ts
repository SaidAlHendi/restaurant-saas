import { redirect } from 'react-router';

import type { PublicMenuPayload } from '@app/shared';

import { fetchPublicMenu } from './api.server.js';
import { getSiteEnv } from './env.server.js';
import { menuPath, parseMenuLocale } from './menu-path.js';

export type MenuLoaderParams = {
  locale: string | undefined;
  orgSlug: string | undefined;
  branchSlug?: string | undefined;
  requestUrl: string;
};

export type MenuLoaderResult = {
  locale: 'ar' | 'en';
  orgSlug: string;
  branchSlug?: string;
  menu: PublicMenuPayload;
  tableLabel: string | null;
  showBranchPicker: boolean;
  cacheControl: string;
  siteBaseUrl: string;
};

export async function loadPublicMenuPage(params: MenuLoaderParams): Promise<MenuLoaderResult> {
  const locale = parseMenuLocale(params.locale);
  if (!locale || !params.orgSlug) {
    throw new Response('Not Found', { status: 404 });
  }

  const branchSlug = params.branchSlug;
  const { menu, cacheControl } = await fetchPublicMenu(params.orgSlug, locale, branchSlug);

  if (!menu.org.locales.includes(locale)) {
    const targetPath = menuPath(menu.org.defaultLocale, params.orgSlug, branchSlug);
    throw redirect(targetPath);
  }

  const url = new URL(params.requestUrl);
  const tableLabel = url.searchParams.get('table');

  const activeBranches = menu.branches;
  const showBranchPicker =
    branchSlug === undefined && activeBranches.length > 1;

  return {
    locale,
    orgSlug: params.orgSlug,
    branchSlug,
    menu,
    tableLabel,
    showBranchPicker,
    cacheControl,
    siteBaseUrl: getSiteEnv().PUBLIC_SITE_URL,
  };
}
