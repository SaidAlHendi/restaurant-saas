import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { Category } from '@app/shared';

import { CategoryRowView } from '../components/CategoriesPageView.js';
import type { CategorySortableListProps } from './category-sortable-list.types.js';

function SortableCategoryRow({
  category,
  canManage,
  label,
  dragLabel,
  editLabel,
  deleteLabel,
  activeLabel,
  inactiveLabel,
  onEdit,
  onDelete,
}: {
  category: Category;
  canManage: boolean;
  label: string;
  dragLabel: string;
  editLabel: string;
  deleteLabel: string;
  activeLabel: string;
  inactiveLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: category.id, disabled: !canManage });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <CategoryRowView
      category={category}
      label={label}
      canManage={canManage}
      dragLabel={dragLabel}
      editLabel={editLabel}
      deleteLabel={deleteLabel}
      activeLabel={activeLabel}
      inactiveLabel={inactiveLabel}
      dragHandleProps={{ ...attributes, ...listeners }}
      rowProps={{ ref: setNodeRef }}
      style={style}
      isDragging={isDragging}
      isDropTarget={isOver}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

export function CategorySortableList({
  items,
  canManage,
  sensors,
  onDragEnd,
  labelFor,
  dragLabel,
  editLabel,
  deleteLabel,
  activeLabel,
  inactiveLabel,
  onEdit,
  onDelete,
}: CategorySortableListProps) {
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
          {items.map((category) => (
            <SortableCategoryRow
              key={category.id}
              category={category}
              canManage={canManage}
              label={labelFor(category)}
              dragLabel={dragLabel}
              editLabel={editLabel}
              deleteLabel={deleteLabel}
              activeLabel={activeLabel}
              inactiveLabel={inactiveLabel}
              onEdit={() => {
                onEdit(category);
              }}
              onDelete={() => {
                onDelete(category);
              }}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
