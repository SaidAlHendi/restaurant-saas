import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { formatMoneyForDisplay } from '@app/shared';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@app/ui';

import { LanguageSwitcher } from './LanguageSwitcher.js';
import { menuThemeStyle } from './menu-theme.js';
import { MenuSearch } from './MenuSearch.js';
import type { MenuPageViewProps } from './menu-page.types.js';
import { useProductSheet } from './use-product-sheet.js';

type MenuHydrationProps = Pick<
  MenuPageViewProps,
  'locale' | 'menu' | 'orgSlug' | 'branchSlug'
> & {
  products: MenuPageViewProps['menu']['categories'][number]['products'];
};

export function MenuHydration({ locale, menu, orgSlug, branchSlug, products }: MenuHydrationProps) {
  const [mounted, setMounted] = useState(false);
  const { openProduct, onOpenProduct, onClose } = useProductSheet(products);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    const handlers: Array<{ el: Element; fn: () => void }> = [];
    for (const product of products) {
      const el = document.querySelector(`[data-product-sheet="${product.id}"]`);
      if (!el) {
        continue;
      }
      const fn = () => {
        onOpenProduct(product.id);
      };
      el.addEventListener('click', fn);
      handlers.push({ el, fn });
    }
    return () => {
      for (const { el, fn } of handlers) {
        el.removeEventListener('click', fn);
      }
    };
  }, [mounted, products, onOpenProduct]);

  if (!mounted) {
    return null;
  }

  const langSlot = document.getElementById('menu-lang-slot');
  const searchSlot = document.getElementById('menu-search-slot');

  return (
    <>
      {langSlot
        ? createPortal(
            <LanguageSwitcher
              locale={locale}
              orgSlug={orgSlug}
              branchSlug={branchSlug}
              org={menu.org}
            />,
            langSlot,
          )
        : null}
      {searchSlot ? createPortal(<MenuSearch locale={locale} />, searchSlot) : null}
      <Sheet
        open={openProduct !== null}
        onOpenChange={(open) => {
          if (!open) {
            onClose();
          }
        }}
      >
        <SheetContent
          side="end"
          style={menuThemeStyle(menu.org.theme)}
          className="overflow-y-auto bg-background text-foreground"
        >
          {openProduct ? (
            <>
              {openProduct.imageUrls ? (
                <img
                  src={openProduct.imageUrls.url800}
                  alt={openProduct.name}
                  width={800}
                  height={600}
                  className="aspect-[4/3] w-full rounded-xl object-cover"
                />
              ) : null}
              <SheetHeader>
                <SheetTitle>{openProduct.name}</SheetTitle>
                <SheetDescription className="text-lg font-bold tabular-nums text-foreground">
                  {formatMoneyForDisplay(
                    openProduct.priceMinor,
                    openProduct.currency,
                    locale,
                    menu.org.display,
                  )}
                </SheetDescription>
              </SheetHeader>
              {openProduct.description ? (
                <p className="text-base text-muted-foreground">{openProduct.description}</p>
              ) : null}
              {openProduct.modifierGroups.length > 0 ? (
                <ul className="mt-6 space-y-5">
                  {openProduct.modifierGroups.map((group) => (
                    <li key={`${openProduct.id}-${group.name}-${String(group.sortOrder)}`}>
                      <p className="text-base font-semibold">{group.name}</p>
                      <ul className="mt-2 space-y-1 text-sm">
                        {group.modifiers.map((mod) => (
                          <li
                            key={`${group.name}-${mod.name}-${String(mod.sortOrder)}`}
                            className="flex justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2"
                          >
                            <span>{mod.name}</span>
                            {mod.priceDeltaMinor > 0 ? (
                              <span className="tabular-nums text-muted-foreground">
                                +{formatMoneyForDisplay(mod.priceDeltaMinor, openProduct.currency, locale, menu.org.display)}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
