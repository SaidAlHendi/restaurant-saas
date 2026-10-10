import { formatMoney } from '@app/shared';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@app/ui';

import { menuPath } from '../../lib/menu-path.js';
import type { MenuPageViewProps } from './menu-page.types.js';

function ProductImage({
  name,
  imageUrls,
}: {
  name: string;
  imageUrls: { url400: string; url800: string; url1200: string } | null;
}) {
  if (!imageUrls) {
    return null;
  }
  return (
    <img
      src={imageUrls.url800}
      srcSet={`${imageUrls.url400} 400w, ${imageUrls.url800} 800w, ${imageUrls.url1200} 1200w`}
      sizes="(max-width: 768px) 100vw, 320px"
      alt={name}
      width={800}
      height={600}
      loading="lazy"
      decoding="async"
      className="aspect-[4/3] w-full rounded-md object-cover"
    />
  );
}

export function MenuPageView({
  locale,
  menu,
  orgSlug,
  branchSlug: _branchSlug,
  tableLabel,
  showBranchPicker,
}: MenuPageViewProps) {
  const poweredByLabel = locale === 'ar' ? 'مدعوم من' : 'Powered by';

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <div>
            {menu.org.logoUrl ? (
              <img
                src={menu.org.logoUrl}
                alt=""
                width={48}
                height={48}
                className="mb-2 h-12 w-12 rounded-md object-contain"
              />
            ) : null}
            <h1 className="text-2xl font-semibold">{menu.org.name}</h1>
            {menu.branch ? (
              <p className="text-sm text-muted-foreground">{menu.branch.name}</p>
            ) : null}
            {tableLabel ? (
              <Badge variant="secondary" className="mt-2">
                {locale === 'ar' ? `طاولة ${tableLabel}` : `Table ${tableLabel}`}
              </Badge>
            ) : null}
          </div>
          <div id="menu-lang-slot" />
        </div>
        <nav
          aria-label={locale === 'ar' ? 'الأقسام' : 'Categories'}
          className="mx-auto mt-3 flex max-w-3xl gap-2 overflow-x-auto pb-1"
        >
          {menu.categories.map((cat) => (
            <a
              key={cat.id}
              href={`#category-${cat.id}`}
              className="shrink-0 rounded-full border border-border px-3 py-1 text-sm hover:bg-muted"
            >
              {cat.name}
            </a>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {showBranchPicker ? (
          <section className="mb-8">
            <h2 className="text-lg font-medium">
              {locale === 'ar' ? 'اختر الفرع' : 'Choose a branch'}
            </h2>
            <ul className="mt-3 space-y-2">
              {menu.branches.map((branch) => (
                <li key={branch.slug}>
                  <a
                    href={menuPath(locale, orgSlug, branch.slug)}
                    className="block rounded-md border border-border px-4 py-3 hover:bg-muted"
                  >
                    <span className="font-medium">{branch.name}</span>
                    {branch.address ? (
                      <span className="mt-1 block text-sm text-muted-foreground">{branch.address}</span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {menu.categories.map((category) => (
          <section key={category.id} id={`category-${category.id}`} className="mb-10 scroll-mt-28">
            <h2 className="text-xl font-semibold">{category.name}</h2>
            <ul className="mt-4 space-y-4">
              {category.products.map((product) => (
                <li key={product.id}>
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="sm:w-40 shrink-0">
                          <ProductImage name={product.name} imageUrls={product.imageUrls} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          <p className="text-base font-medium text-foreground">
                            {formatMoney(product.priceMinor, product.currency, locale)}
                          </p>
                          {product.description ? (
                            <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
                          ) : null}
                          <button
                            type="button"
                            data-product-sheet={product.id}
                            className="mt-2 text-sm text-primary underline"
                          >
                            {locale === 'ar' ? 'تفاصيل' : 'Details'}
                          </button>
                        </div>
                      </div>
                    </CardHeader>
                    {product.modifierGroups.length > 0 ? (
                      <CardContent className="pt-0">
                        <details className="rounded-md border border-border px-3 py-2">
                          <summary className="cursor-pointer text-sm font-medium">
                            {locale === 'ar' ? 'الإضافات' : 'Modifiers'}
                          </summary>
                          <ul className="mt-2 space-y-3">
                            {product.modifierGroups.map((group) => (
                              <li key={`${product.id}-g-${group.name}-${String(group.sortOrder)}`}>
                                <p className="text-sm font-medium">{group.name}</p>
                                <ul className="ms-4 mt-1 space-y-1 text-sm text-muted-foreground">
                                  {group.modifiers.map((mod) => (
                                    <li key={`${product.id}-m-${mod.name}-${String(mod.sortOrder)}`}>
                                      {mod.name}
                                      {mod.priceDeltaMinor > 0
                                        ? ` (+${formatMoney(mod.priceDeltaMinor, product.currency, locale)})`
                                        : null}
                                    </li>
                                  ))}
                                </ul>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </CardContent>
                    ) : null}
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {menu.poweredBy ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">{poweredByLabel}</p>
        ) : null}
      </main>
    </>
  );
}
