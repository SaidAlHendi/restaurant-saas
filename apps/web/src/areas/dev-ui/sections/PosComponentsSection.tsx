import {
  CartLine,
  CategoryTile,
  ConnectionBanner,
  KdsColumn,
  KdsOrderCard,
  OpenOrderChip,
  ProductTile,
} from '@app/ui';

import type { PosComponentsDemo } from '../pos-components-demo.js';

type PosComponentsCopy = {
  title: string;
  productTile: string;
  cartLine: string;
  kds: string;
};

export function PosComponentsSection({
  copy,
  demo,
}: {
  copy: PosComponentsCopy;
  demo: PosComponentsDemo;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{copy.title}</h2>
      <div>
        <p className="mb-2 text-sm text-muted-foreground">{copy.productTile}</p>
        <div className="max-w-xs">
          <ProductTile {...demo.productTile} />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {demo.categoryTiles.map(({ id, ...tile }) => (
          <CategoryTile
            key={id}
            {...tile}
            onPress={() => {
              /* demo */
            }}
          />
        ))}
        <OpenOrderChip {...demo.openOrder} />
      </div>
      <div>
        <p className="mb-2 text-sm text-muted-foreground">{copy.cartLine}</p>
        <div className="max-w-md rounded-lg border px-3">
          <CartLine {...demo.cartLine} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{copy.kds}</p>
        <ConnectionBanner {...demo.kds.banner} className="rounded-md" />
        <div className="max-w-sm">
          <KdsColumn {...demo.kds.column} count={demo.kds.cards.length}>
            {demo.kds.cards.map(({ id, ...card }) => (
              <KdsOrderCard key={id} {...card} />
            ))}
          </KdsColumn>
        </div>
      </div>
    </section>
  );
}
