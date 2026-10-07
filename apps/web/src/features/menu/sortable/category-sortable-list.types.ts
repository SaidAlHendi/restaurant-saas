import type { DndContextProps, DragEndEvent } from '@dnd-kit/core';

import type { Category } from '@app/shared';

export interface CategorySortableListProps {
  items: Category[];
  canManage: boolean;
  sensors: DndContextProps['sensors'];
  onDragEnd: (event: DragEndEvent) => void;
  labelFor: (category: Category) => string;
  dragLabel: string;
  editLabel: string;
  deleteLabel: string;
  activeLabel: string;
  inactiveLabel: string;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}
