import { useCallback, useState } from 'react';

export function usePosComponentsDemo() {
  const [qty, setQty] = useState(2);

  const onIncrease = useCallback(() => {
    setQty((prev) => Math.min(99, prev + 1));
  }, []);

  const onDecrease = useCallback(() => {
    setQty((prev) => Math.max(1, prev - 1));
  }, []);

  const onRemove = useCallback(() => {
    setQty(1);
  }, []);

  return {
    productTile: {
      name: 'Flat white',
      priceLabel: 'SAR 18.00',
      imageUrl: null as string | null,
      onPress: () => {
        /* demo */
      },
    },
    cartLine: {
      name: 'Flat white',
      unitPriceLabel: 'SAR 18.00',
      lineTotalLabel: 'SAR 36.00',
      quantity: qty,
      modifiers: [{ id: 'm1', label: 'Oat milk' }],
      note: 'Less foam',
      decreaseLabel: 'Decrease quantity',
      increaseLabel: 'Increase quantity',
      removeLabel: 'Remove line',
      onIncrease,
      onDecrease,
      onRemove,
    },
  };
}

export type PosComponentsDemo = ReturnType<typeof usePosComponentsDemo>;
