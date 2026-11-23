import { heroText, menuThemeVars, type MenuTheme } from '@app/shared';

export type MenuLookPreviewDish = { id: string; name: string; description: string; price: string };

export type MenuLookPreviewProps = {
  theme: MenuTheme;
  locale: 'ar' | 'en';
  restaurantName: string;
  /** Hero cover photo; shown in an arch while the hero is on. */
  coverUrl?: string | null;
  categories: string[];
  dishes: MenuLookPreviewDish[];
  searchPlaceholder: string;
  label: string;
};

const DISH_LIST_CLASS = {
  grid: 'grid grid-cols-2 gap-x-3 gap-y-5',
  list: 'grid gap-2',
  compact: 'grid gap-1.5',
} as const;

/** A small copy of the public menu, drawn with the saved preset's colours so owners see the result before saving. */
export function MenuLookPreview(props: MenuLookPreviewProps) {
  const { theme, locale, restaurantName, coverUrl, categories, dishes, searchPlaceholder, label } = props;
  const hero = theme.hero.enabled;
  const hasSubline = Boolean(theme.hero.subline.ar || theme.hero.subline.en);
  const closing = heroText(theme.closingLine, locale, '');

  return (
    <div
      role="img"
      aria-label={label}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      lang={locale}
      // The public menu is always light; without this the `classic` look would follow a dark dashboard.
      data-theme="cupcake"
      style={menuThemeVars(theme)}
      className="bg-background text-foreground border-border overflow-hidden rounded-2xl border text-start"
    >
      {hero ? (
        <header className="bg-primary text-primary-foreground px-4 pt-4 pb-7">
          <p className="truncate text-sm font-semibold">{restaurantName}</p>
          <h3 className="mt-6 text-2xl leading-tight font-bold text-balance">
            {heroText(theme.hero.headline, locale, restaurantName)}
          </h3>
          {hasSubline ? (
            <p className="mt-2 text-sm opacity-85">{heroText(theme.hero.subline, locale, '')}</p>
          ) : null}
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              className="mt-5 aspect-[4/5] w-3/5 rounded-t-[999px] rounded-b-2xl object-cover"
            />
          ) : null}
        </header>
      ) : (
        <header className="px-4 pt-5 pb-3">
          <h3 className="text-xl leading-tight font-bold">{restaurantName}</h3>
        </header>
      )}

      <div className="flex gap-2 overflow-hidden px-4 py-2">
        {categories.map((name) => (
          <span
            key={name}
            className="bg-muted shrink-0 rounded-full px-3 py-1 text-xs font-medium"
          >
            {name}
          </span>
        ))}
      </div>

      {theme.showTicker ? (
        <div className="border-border overflow-hidden border-y py-1.5 text-xs font-semibold whitespace-nowrap">
          {categories.join(' ✦ ')}
        </div>
      ) : null}

      {theme.showSearch ? (
        <div className="px-4 pb-2">
          <div className="bg-muted text-muted-foreground rounded-full px-4 py-2 text-xs">
            {searchPlaceholder}
          </div>
        </div>
      ) : null}

      <div className={`px-4 pt-2 pb-5 ${DISH_LIST_CLASS[theme.layout]}`}>
        {dishes.map((dish) =>
          theme.layout === 'grid' ? (
            <div key={dish.id}>
              <div className="bg-muted aspect-[4/3] rounded-xl" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold">{dish.name}</p>
              <p className="text-sm font-bold tabular-nums">{dish.price}</p>
            </div>
          ) : (
            <div key={dish.id} className="bg-muted/60 flex gap-3 rounded-xl p-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">{dish.name}</p>
                  {theme.layout === 'compact' ? (
                    <p className="text-sm font-bold tabular-nums">{dish.price}</p>
                  ) : null}
                </div>
                <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">{dish.description}</p>
                {theme.layout === 'list' ? (
                  <p className="mt-1.5 text-sm font-bold tabular-nums">{dish.price}</p>
                ) : null}
              </div>
              {theme.layout === 'list' ? (
                <div className="bg-muted size-14 shrink-0 rounded-lg" aria-hidden="true" />
              ) : null}
            </div>
          ),
        )}
      </div>
      {closing ? (
        <footer className="bg-primary text-primary-foreground px-4 py-8">
          <p className="text-2xl leading-tight font-bold text-balance">{closing}</p>
        </footer>
      ) : null}
    </div>
  );
}
