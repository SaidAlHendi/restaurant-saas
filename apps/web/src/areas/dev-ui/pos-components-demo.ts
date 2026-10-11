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

  const [burgerReady, setBurgerReady] = useState(false);
  const toggleBurger = useCallback(() => {
    setBurgerReady((prev) => !prev);
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
    kds: {
      banner: { visible: true, message: 'Disconnected — reconnecting… Taps are paused.' },
      column: { title: 'Preparing', status: 'preparing' as const, emptyLabel: 'No orders' },
      cards: [
        {
          id: 'demo-12',
          orderNumberLabel: '#12',
          typeLabel: 'Dine in',
          subtitle: 'Table 5',
          ageLabel: '12:40',
          ageLevel: 'amber' as const,
          note: 'Allergy: no nuts',
          addedLabel: 'ADDED',
          voidedLabel: 'VOID',
          actionLabel: 'Ready',
          onAction: () => {
            /* demo */
          },
          items: [
            {
              id: 'i1',
              quantity: 2,
              name: 'Burger',
              modifiers: ['Large', 'No onion'],
              isReady: burgerReady,
              isAddition: false,
              isVoided: false,
              onToggle: toggleBurger,
            },
            {
              id: 'i2',
              quantity: 1,
              name: 'Fries',
              modifiers: [],
              isReady: false,
              isAddition: false,
              isVoided: true,
              voidReason: 'Customer changed mind',
            },
            {
              id: 'i3',
              quantity: 1,
              name: 'Cola',
              modifiers: [],
              note: 'No ice',
              isReady: false,
              isAddition: true,
              isVoided: false,
              onToggle: () => {
                /* demo */
              },
            },
          ],
        },
        {
          id: 'demo-9',
          orderNumberLabel: '#9',
          typeLabel: 'Takeaway',
          subtitle: 'Sara',
          ageLabel: '24:03',
          ageLevel: 'red' as const,
          addedLabel: 'ADDED',
          voidedLabel: 'VOID',
          statusNote: 'Awaiting payment',
          items: [
            {
              id: 'i4',
              quantity: 1,
              name: 'Shawarma',
              modifiers: [],
              isReady: true,
              isAddition: false,
              isVoided: false,
            },
          ],
        },
      ],
    },
  };
}

export type PosComponentsDemo = ReturnType<typeof usePosComponentsDemo>;
