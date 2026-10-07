import {
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useCallback, useRef } from 'react';

export function useOptimisticReorder<T extends { id: string }>(options: {
  items: T[];
  canManage: boolean;
  commit: (orderedIds: string[]) => Promise<{ error?: unknown }>;
  applyOptimistic: (nextItems: T[]) => void;
}) {
  const { items, canManage, commit, applyOptimistic } = options;
  const snapshotRef = useRef<T[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!canManage) {
        return;
      }
      const { active, over } = event;
      if (!over || active.id === over.id) {
        return;
      }
      const oldIndex = items.findIndex((item) => item.id === String(active.id));
      const newIndex = items.findIndex((item) => item.id === String(over.id));
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
        return;
      }
      const orderedIds = arrayMove(
        items.map((item) => item.id),
        oldIndex,
        newIndex,
      );
      const idToItem = new Map(items.map((item) => [item.id, item]));
      const nextItems = orderedIds
        .map((id) => idToItem.get(id))
        .filter((item): item is T => item !== undefined);
      if (nextItems.length !== items.length) {
        return;
      }
      snapshotRef.current = items;
      applyOptimistic(nextItems);
      void commit(orderedIds).then((result) => {
        if (result.error && snapshotRef.current) {
          applyOptimistic(snapshotRef.current);
        }
        snapshotRef.current = null;
      });
    },
    [applyOptimistic, canManage, commit, items],
  );

  return {
    sensors,
    onDragEnd,
  };
}
