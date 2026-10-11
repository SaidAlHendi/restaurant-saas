import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { formatMoney } from '@app/shared';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@app/ui';

import { LanguageSwitcher } from './LanguageSwitcher.js';
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
      <Sheet
        open={openProduct !== null}
        onOpenChange={(open) => {
          if (!open) {
            onClose();
          }
        }}
      >
        <SheetContent side="end" className="overflow-y-auto">
          {openProduct ? (
            <>
              <SheetHeader>
                <SheetTitle>{openProduct.name}</SheetTitle>
                <SheetDescription>
                  {formatMoney(openProduct.priceMinor, openProduct.currency, locale)}
                </SheetDescription>
              </SheetHeader>
              {openProduct.description ? (
                <p className="text-sm text-muted-foreground">{openProduct.description}</p>
              ) : null}
              {openProduct.modifierGroups.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {openProduct.modifierGroups.map((group) => (
                    <li key={`${openProduct.id}-${group.name}-${String(group.sortOrder)}`}>
                      <p className="text-sm font-medium">{group.name}</p>
                      <ul className="ms-4 mt-1 space-y-1 text-sm text-muted-foreground">
                        {group.modifiers.map((mod) => (
                          <li key={`${group.name}-${mod.name}-${String(mod.sortOrder)}`}>
                            {mod.name}
                            {mod.priceDeltaMinor > 0
                              ? ` (+${formatMoney(mod.priceDeltaMinor, openProduct.currency, locale)})`
                              : null}
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
