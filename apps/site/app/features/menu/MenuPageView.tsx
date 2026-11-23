import { formatMoneyForDisplay } from '@app/shared';

import { menuPath } from '../../lib/menu-path.js';
import { heroText, menuThemeStyle } from './menu-theme.js';
import './menu.css';
import type { MenuPageViewProps, MenuProductView } from './menu-page.types.js';

function ProductImage({
  product,
  className,
  sizes,
}: {
  product: MenuProductView;
  className: string;
  sizes: string;
}) {
  const urls = product.imageUrls;
  if (!urls) {
    return null;
  }
  return (
    <img
      src={urls.url800}
      srcSet={`${urls.url400} 400w, ${urls.url800} 800w, ${urls.url1200} 1200w`}
      sizes={sizes}
      alt={product.name}
      width={800}
      height={600}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}

const ROW_CARD =
  'relative flex h-full w-full gap-4 rounded-2xl bg-muted/60 p-3 transition-colors focus-within:bg-muted hover:bg-muted';

/**
 * The dish name is the real button; its `::after` stretches over the whole card so the card is one
 * tap target while the heading, price and description stay ordinary, valid HTML.
 */
const NAME_BUTTON =
  "text-start after:absolute after:inset-0 after:content-[''] focus-visible:outline-none after:focus-visible:outline-2 after:focus-visible:outline-offset-2 after:focus-visible:outline-primary after:rounded-2xl";

/** Option names and prices for crawlers, screen readers and guests before the sheet loads. */
function ProductOptions({
  product,
  formatMoney,
}: {
  product: MenuProductView;
  formatMoney: (minor: number) => string;
}) {
  if (product.modifierGroups.length === 0) {
    return null;
  }
  return (
    <ul className="sr-only">
      {product.modifierGroups.map((group) => (
        <li key={`${product.id}-g-${group.name}-${String(group.sortOrder)}`}>
          {group.name}
          <ul>
            {group.modifiers.map((mod) => (
              <li key={`${product.id}-m-${mod.name}-${String(mod.sortOrder)}`}>
                {mod.name}
                {mod.priceDeltaMinor > 0 ? ` (+${formatMoney(mod.priceDeltaMinor)})` : null}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function ProductCard({
  product,
  layout,
  formatMoney,
}: {
  product: MenuProductView;
  layout: 'grid' | 'list' | 'compact';
  formatMoney: (minor: number) => string;
}) {
  const price = formatMoney(product.priceMinor);
  const options =
    product.modifierGroups.length > 0
      ? product.modifierGroups.map((g) => g.name).join(' · ')
      : null;
  const name = (
    <h3 className="text-lg leading-snug font-semibold">
      <button type="button" data-product-sheet={product.id} className={NAME_BUTTON}>
        {product.name}
      </button>
    </h3>
  );

  if (layout === 'grid') {
    return (
      <div className="group relative flex h-full w-full flex-col">
        {product.imageUrls ? (
          <ProductImage
            product={product}
            sizes="(max-width: 640px) 50vw, 240px"
            className="aspect-[4/3] w-full rounded-2xl object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="aspect-[4/3] w-full rounded-2xl bg-muted" aria-hidden="true" />
        )}
        <div className="mt-3 text-base">{name}</div>
        {product.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        ) : null}
        <p className="mt-auto pt-3 text-base font-bold tabular-nums">{price}</p>
        <ProductOptions product={product} formatMoney={formatMoney} />
      </div>
    );
  }

  return (
    <div className={ROW_CARD}>
      <div className="flex min-w-0 flex-1 flex-col py-1 ps-2">
        <div className="flex items-baseline justify-between gap-3">
          {name}
          {layout === 'compact' ? (
            <p className="shrink-0 text-base font-bold tabular-nums">{price}</p>
          ) : null}
        </div>
        {product.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        ) : null}
        {options ? (
          <p className="mt-1 truncate text-xs text-muted-foreground" aria-hidden="true">
            {options}
          </p>
        ) : null}
        {layout === 'list' ? (
          <p className="mt-auto pt-3 text-base font-bold tabular-nums">{price}</p>
        ) : null}
        <ProductOptions product={product} formatMoney={formatMoney} />
      </div>
      {layout === 'list' && product.imageUrls ? (
        <ProductImage
          product={product}
          sizes="112px"
          className="size-28 shrink-0 rounded-xl object-cover"
        />
      ) : null}
    </div>
  );
}

const LIST_CLASS: Record<'grid' | 'list' | 'compact', string> = {
  grid: 'grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4',
  list: 'grid gap-3 md:grid-cols-2',
  compact: 'grid gap-2 md:grid-cols-2',
};

export function MenuPageView({
  locale,
  menu,
  orgSlug,
  branchSlug: _branchSlug,
  tableLabel,
  showBranchPicker,
}: MenuPageViewProps) {
  const poweredByLabel = locale === 'ar' ? 'مدعوم من' : 'Powered by';
  const theme = menu.org.theme;
  const hero = theme.hero.enabled;
  const closingLine = heroText(theme.closingLine, locale, '');
  const tableTag = tableLabel ? (
    <p
      className={`mt-4 inline-block rounded-full px-4 py-1.5 text-sm font-semibold ${
        hero ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'
      }`}
    >
      {locale === 'ar' ? `طاولة ${tableLabel}` : `Table ${tableLabel}`}
    </p>
  ) : null;
  const logo = menu.org.logoUrl ? (
    <img
      src={menu.org.logoUrl}
      alt=""
      width={64}
      height={64}
      className="size-16 shrink-0 rounded-2xl bg-muted object-contain"
    />
  ) : null;

  return (
    <div style={menuThemeStyle(theme)} className="min-h-screen bg-background text-foreground">
      {hero ? (
        <header className="bg-primary text-primary-foreground">
          <div className="mx-auto max-w-4xl px-5 pt-6 pb-12 sm:pb-16">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                {logo}
                <p className="truncate text-lg font-semibold">{menu.org.name}</p>
              </div>
              <div id="menu-lang-slot" className="shrink-0" />
            </div>
            <div
              className={`mt-10 grid items-end gap-8 sm:mt-12 sm:gap-10 ${
                menu.org.coverUrls ? 'sm:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]' : ''
              }`}
            >
              <div>
                <h1 className="max-w-2xl text-4xl leading-[1.1] font-bold tracking-tight text-balance sm:text-6xl">
                  {heroText(theme.hero.headline, locale, menu.org.name)}
                </h1>
                {theme.hero.subline.ar || theme.hero.subline.en ? (
                  <p className="mt-4 max-w-xl text-lg opacity-85">
                    {heroText(theme.hero.subline, locale, '')}
                  </p>
                ) : null}
                {menu.branch ? <p className="mt-6 text-base opacity-85">{menu.branch.name}</p> : null}
                {tableTag}
              </div>
              {menu.org.coverUrls ? (
                <img
                  src={menu.org.coverUrls.url960}
                  srcSet={`${menu.org.coverUrls.url480} 480w, ${menu.org.coverUrls.url960} 960w`}
                  sizes="(min-width: 640px) 288px, 70vw"
                  alt=""
                  width={480}
                  height={600}
                  fetchPriority="high"
                  className="aspect-[4/5] w-[70%] max-w-72 rounded-t-[999px] rounded-b-3xl bg-primary-foreground/10 object-cover sm:w-full"
                />
              ) : null}
            </div>
          </div>
        </header>
      ) : (
        <header className="mx-auto max-w-4xl px-5 pt-8 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              {logo}
              <div className="min-w-0">
                <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
                  {menu.org.name}
                </h1>
                {menu.branch ? (
                  <p className="mt-1 text-base text-muted-foreground">{menu.branch.name}</p>
                ) : null}
              </div>
            </div>
            <div id="menu-lang-slot" className="shrink-0 pt-2" />
          </div>
          {tableTag}
        </header>
      )}

      <nav
        aria-label={locale === 'ar' ? 'الأقسام' : 'Categories'}
        className="sticky top-0 z-10 bg-background"
      >
        <div className="mx-auto flex max-w-4xl gap-2 overflow-x-auto px-5 py-3">
          {menu.categories.map((cat) => (
            <a
              key={cat.id}
              href={`#category-${cat.id}`}
              className="shrink-0 rounded-full bg-muted px-4 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {cat.name}
            </a>
          ))}
        </div>
        {theme.showSearch ? <div id="menu-search-slot" className="mx-auto max-w-4xl px-5 pb-3" /> : null}
      </nav>

      {theme.showTicker && menu.categories.length > 0 ? (
        <div
          aria-hidden="true"
          className="overflow-hidden border-y border-border py-2.5 text-sm font-semibold whitespace-nowrap"
        >
          <div className="menu-ticker-track flex w-max">
            {[0, 1].map((copy) => (
              <span key={copy} className="flex shrink-0 gap-6 pe-6">
                {menu.categories.map((cat) => (
                  <span key={cat.id} className="flex items-center gap-6">
                    {cat.name}
                    <span className="text-primary">✦</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-4xl px-5 pt-6 pb-16">
        {showBranchPicker ? (
          <section className="mb-14">
            <h2 className="text-2xl font-bold tracking-tight">
              {locale === 'ar' ? 'اختر الفرع' : 'Choose a branch'}
            </h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {menu.branches.map((branch) => (
                <li key={branch.slug}>
                  <a
                    href={menuPath(locale, orgSlug, branch.slug)}
                    className="block rounded-2xl bg-muted/60 px-5 py-4 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <span className="text-lg font-semibold">{branch.name}</span>
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
          <section
            key={category.id}
            id={`category-${category.id}`}
            data-menu-section
            className="mb-14 scroll-mt-32"
          >
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{category.name}</h2>
            <ul className={`mt-5 ${LIST_CLASS[theme.layout]}`}>
              {category.products.map((product) => (
                <li
                  key={product.id}
                  data-menu-item
                  data-search={`${product.name} ${product.description ?? ''}`.toLowerCase()}
                >
                  <ProductCard
                    product={product}
                    layout={theme.layout}
                    formatMoney={(minor) =>
                      formatMoneyForDisplay(minor, product.currency, locale, menu.org.display)
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p
          id="menu-no-results"
          hidden
          className="py-10 text-center text-base text-muted-foreground"
        >
          {locale === 'ar' ? 'لا توجد نتائج' : 'No dishes match your search'}
        </p>

        {menu.poweredBy ? (
          <p className="text-center text-sm text-muted-foreground">{poweredByLabel}</p>
        ) : null}
      </main>

      {closingLine ? (
        <footer className="bg-primary text-primary-foreground">
          <div className="mx-auto max-w-4xl px-5 py-14 sm:py-20">
            <p className="max-w-3xl text-4xl leading-[1.1] font-bold tracking-tight text-balance sm:text-6xl">
              {closingLine}
            </p>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
