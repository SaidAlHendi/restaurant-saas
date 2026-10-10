import { data } from 'react-router';

import { MenuHydration } from '../features/menu/MenuHydration.js';
import { MenuPageView } from '../features/menu/MenuPageView.js';
import { menuCanonicalUrl } from '../lib/menu-path.js';
import { loadPublicMenuPage } from '../lib/public-menu-loader.server.js';
import { buildMenuJsonLd, buildMenuPageMeta, serializeJsonLd } from '../lib/seo.js';

type LoaderData = Awaited<ReturnType<typeof loadPublicMenuPage>>;

export async function loader({
  params,
  request,
}: {
  params: { locale?: string; orgSlug?: string; branchSlug?: string };
  request: Request;
}) {
  const result = await loadPublicMenuPage({
    locale: params.locale,
    orgSlug: params.orgSlug,
    branchSlug: params.branchSlug,
    requestUrl: request.url,
  });
  return data(result, {
    headers: {
      'Cache-Control': result.cacheControl,
    },
  });
}

export function meta({ data: loaderData }: { data?: LoaderData }) {
  if (!loaderData) {
    return [{ title: 'Menu' }];
  }
  const canonical = menuCanonicalUrl(
    loaderData.siteBaseUrl,
    loaderData.locale,
    loaderData.orgSlug,
    loaderData.branchSlug,
  );
  return buildMenuPageMeta({
    menu: loaderData.menu,
    locale: loaderData.locale,
    canonical,
    siteBaseUrl: loaderData.siteBaseUrl,
    orgSlug: loaderData.orgSlug,
    branchSlug: loaderData.branchSlug,
  });
}

export default function LocaleMenuBranchRoute({ loaderData }: { loaderData: LoaderData }) {
  const canonical = menuCanonicalUrl(
    loaderData.siteBaseUrl,
    loaderData.locale,
    loaderData.orgSlug,
    loaderData.branchSlug,
  );
  const jsonLd = buildMenuJsonLd({
    menu: loaderData.menu,
    locale: loaderData.locale,
    url: canonical,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <MenuPageView
        locale={loaderData.locale}
        menu={loaderData.menu}
        orgSlug={loaderData.orgSlug}
        branchSlug={loaderData.branchSlug}
        tableLabel={loaderData.tableLabel}
        showBranchPicker={false}
        canonicalUrl={canonical}
      />
      <MenuHydration
        locale={loaderData.locale}
        menu={loaderData.menu}
        orgSlug={loaderData.orgSlug}
        branchSlug={loaderData.branchSlug}
        products={loaderData.menu.categories.flatMap((c) => c.products)}
      />
    </>
  );
}
