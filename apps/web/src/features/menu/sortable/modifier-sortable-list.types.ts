import type { DndContextProps, DragEndEvent } from '@dnd-kit/core';

import type { Modifier } from '@app/shared';

export interface ModifierSortableListProps {
  modifiers: Modifier[];
  canManage: boolean;
  sensors: DndContextProps['sensors'];
  onDragEnd: (event: DragEndEvent) => void;
  modifierLabel: (modifier: Modifier) => string;
  priceLabel: (modifier: Modifier) => string;
  activeLabel: string;
  inactiveLabel: string;
  dragLabel: string;
  deleteModifierLabel: string;
  onDeleteModifier: (modifier: Modifier) => void;
}
