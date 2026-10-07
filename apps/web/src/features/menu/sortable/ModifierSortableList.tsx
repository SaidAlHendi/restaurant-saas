import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVerticalIcon, Trash2Icon } from 'lucide-react';

import { Badge, IconButton } from '@app/ui';

import type { Modifier } from '@app/shared';

import type { ModifierSortableListProps } from './modifier-sortable-list.types.js';

function SortableModifierRow({
  modifier,
  canManage,
  modifierLabel,
  priceLabel,
  activeLabel,
  inactiveLabel,
  dragLabel,
  deleteModifierLabel,
  onDeleteModifier,
}: {
  modifier: Modifier;
  canManage: boolean;
  modifierLabel: string;
  priceLabel: string;
  activeLabel: string;
  inactiveLabel: string;
  dragLabel: string;
  deleteModifierLabel: string;
  onDeleteModifier: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: modifier.id,
    disabled: !canManage,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
    >
      {canManage ? (
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground touch-none cursor-grab active:cursor-grabbing"
          aria-label={dragLabel}
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-5" aria-hidden />
        </button>
      ) : null}
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="font-medium">{modifierLabel}</span>
        <span className="text-muted-foreground text-xs">{priceLabel}</span>
      </div>
      <Badge variant={modifier.isActive ? 'default' : 'secondary'}>
        {modifier.isActive ? activeLabel : inactiveLabel}
      </Badge>
      {canManage ? (
        <IconButton
          icon={<Trash2Icon />}
          label={deleteModifierLabel}
          variant="ghost"
          onClick={() => {
            onDeleteModifier();
          }}
        />
      ) : null}
    </li>
  );
}

export function ModifierSortableList({
  modifiers,
  canManage,
  sensors,
  onDragEnd,
  modifierLabel,
  priceLabel,
  activeLabel,
  inactiveLabel,
  dragLabel,
  deleteModifierLabel,
  onDeleteModifier,
}: ModifierSortableListProps) {
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext
        items={modifiers.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-col gap-2">
          {modifiers.map((modifier) => (
            <SortableModifierRow
              key={modifier.id}
              modifier={modifier}
              canManage={canManage}
              modifierLabel={modifierLabel(modifier)}
              priceLabel={priceLabel(modifier)}
              activeLabel={activeLabel}
              inactiveLabel={inactiveLabel}
              dragLabel={dragLabel}
              deleteModifierLabel={deleteModifierLabel}
              onDeleteModifier={() => {
                onDeleteModifier(modifier);
              }}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
