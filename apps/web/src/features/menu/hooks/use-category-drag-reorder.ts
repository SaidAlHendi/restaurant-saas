import { useCallback, useState, type DragEvent, type HTMLAttributes } from 'react';

import type { Category } from '@app/shared';

import { reorderByDrag } from '../menu.utils.js';

export function useCategoryDragReorder(
  items: Category[],
  canManage: boolean,
  onReorder: (orderedIds: string[]) => void,
) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const getDragHandleProps = useCallback(
    (categoryId: string): HTMLAttributes<HTMLButtonElement> => ({
      draggable: canManage,
      onDragStart: (event: DragEvent<HTMLButtonElement>) => {
        event.dataTransfer.setData('text/plain', categoryId);
        event.dataTransfer.effectAllowed = 'move';
        setDraggingId(categoryId);
      },
      onDragEnd: () => {
        setDraggingId(null);
        setOverId(null);
      },
    }),
    [canManage],
  );

  const getRowProps = useCallback(
    (categoryId: string): HTMLAttributes<HTMLLIElement> => ({
      onDragOver: (event: DragEvent<HTMLLIElement>) => {
        if (!canManage) {
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setOverId(categoryId);
      },
      onDragLeave: () => {
        setOverId((current) => (current === categoryId ? null : current));
      },
      onDrop: (event: DragEvent<HTMLLIElement>) => {
        if (!canManage) {
          return;
        }
        event.preventDefault();
        const activeId = draggingId ?? event.dataTransfer.getData('text/plain');
        const next = reorderByDrag(items, activeId, categoryId);
        if (next) {
          onReorder(next);
        }
        setDraggingId(null);
        setOverId(null);
      },
    }),
    [canManage, draggingId, items, onReorder],
  );

  return {
    getDragHandleProps,
    getRowProps,
    isDragging: (categoryId: string) => draggingId === categoryId,
    isOver: (categoryId: string) => overId === categoryId && draggingId !== categoryId,
  };
}
