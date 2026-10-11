import { useCallback, useMemo, useState } from 'react';

import type { PosMenuPayload } from '@app/shared';

import type { CartLineInput } from '../../cart/cart.types.js';
import { cartActions } from '../../cart/cart.slice.js';
import { validateModifierSelection } from '../../cart/cart.utils.js';
import { useAppDispatch } from '../../../app/hooks.js';
import { posLocalizedName } from '../pos-label.utils.js';

export type PosMenuProduct = PosMenuPayload['categories'][number]['products'][number];

export function usePosModifierSheet(input: {
  locale: string;
  defaultLocale: string;
  onAddLine?: (line: CartLineInput) => void;
}) {
  const dispatch = useAppDispatch();
  const [product, setProduct] = useState<PosMenuProduct | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedModifierIds, setSelectedModifierIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [validationError, setValidationError] = useState(false);

  const openForProduct = useCallback((next: PosMenuProduct) => {
    setProduct(next);
    setSelectedModifierIds([]);
    setQuantity(1);
    setNote('');
    setValidationError(false);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setProduct(null);
  }, []);

  const toggleModifier = useCallback(
    (groupId: string, modifierId: string, maxSelect: number) => {
      setSelectedModifierIds((prev) => {
        const group = product?.modifierGroups.find((g) => g.id === groupId);
        if (!group) {
          return prev;
        }
        const inGroup = group.modifiers.map((m) => m.id);
        const selectedInGroup = prev.filter((id) => inGroup.includes(id));
        const has = prev.includes(modifierId);
        if (maxSelect === 1) {
          const withoutGroup = prev.filter((id) => !inGroup.includes(id));
          return has ? withoutGroup : [...withoutGroup, modifierId];
        }
        if (has) {
          return prev.filter((id) => id !== modifierId);
        }
        if (selectedInGroup.length >= maxSelect) {
          return prev;
        }
        return [...prev, modifierId];
      });
    },
    [product],
  );

  const groupsForValidation = useMemo(() => {
    if (!product) {
      return [];
    }
    return product.modifierGroups.map((group) => ({
      id: group.id,
      minSelect: group.minSelect,
      maxSelect: group.maxSelect,
      modifierIds: group.modifiers.map((m) => m.id),
    }));
  }, [product]);

  const addToCart = useCallback(() => {
    if (!product) {
      return;
    }
    const valid = validateModifierSelection(groupsForValidation, selectedModifierIds);
    if (!valid.ok) {
      setValidationError(true);
      return;
    }
    let unitPriceMinor = product.priceMinor;
    const modifierNames: Record<string, Record<string, string>> = {};
    for (const group of product.modifierGroups) {
      for (const mod of group.modifiers) {
        if (selectedModifierIds.includes(mod.id)) {
          unitPriceMinor += mod.priceDeltaMinor;
          modifierNames[mod.id] = mod.name;
        }
      }
    }
    const line: CartLineInput = {
      productId: product.id,
      nameSnapshot: product.name,
      unitPriceMinor,
      modifierIds: [...selectedModifierIds],
      modifierNames,
      quantity,
      note,
    };
    if (input.onAddLine) {
      input.onAddLine(line);
    } else {
      dispatch(cartActions.addLine(line));
    }
    close();
  }, [
    close,
    dispatch,
    groupsForValidation,
    input,
    note,
    product,
    quantity,
    selectedModifierIds,
  ]);

  const productName =
    product === null
      ? ''
      : posLocalizedName(product.name, input.locale, input.defaultLocale);

  return {
    open,
    product,
    productName,
    selectedModifierIds,
    quantity,
    note,
    validationError,
    openForProduct,
    close,
    setQuantity,
    setNote,
    toggleModifier,
    addToCart,
    onOpenChange: (next: boolean) => {
      if (!next) {
        close();
      }
    },
  };
}
