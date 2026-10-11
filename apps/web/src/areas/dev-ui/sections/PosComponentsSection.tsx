import { CartLine, ProductTile } from '@app/ui';

import type { PosComponentsDemo } from '../pos-components-demo.js';

type PosComponentsCopy = {
  title: string;
  productTile: string;
  cartLine: string;
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
      <div>
        <p className="mb-2 text-sm text-muted-foreground">{copy.cartLine}</p>
        <div className="max-w-md rounded-lg border px-3">
          <CartLine {...demo.cartLine} />
        </div>
      </div>
    </section>
  );
}
