import { useCallback, useState } from 'react';

import type { MenuProductView } from './menu-page.types.js';

export function useProductSheet(products: MenuProductView[]) {
  const [openProductId, setOpenProductId] = useState<string | null>(null);

  const openProduct = products.find((p) => p.id === openProductId) ?? null;

  const onOpenProduct = useCallback((productId: string) => {
    setOpenProductId(productId);
  }, []);

  const onClose = useCallback(() => {
    setOpenProductId(null);
  }, []);

  return {
    openProduct,
    openProductId,
    onOpenProduct,
    onClose,
  };
}
