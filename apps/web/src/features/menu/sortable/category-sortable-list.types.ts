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
  /** Where the category is shown; undefined when the member has a single branch. */
  availabilityLabelFor?: ((category: Category) => string) | undefined;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}
