import { renderHook, act } from '@testing-library/react';
import type { DragEndEvent } from '@dnd-kit/core';
import { describe, expect, it, vi } from 'vitest';

import { useOptimisticReorder } from './use-optimistic-reorder.js';

const clientRect = {
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: 0,
  height: 0,
};

function mockDragEndEvent(activeId: string, overId: string): DragEndEvent {
  return {
    active: {
      id: activeId,
      data: { current: undefined },
      rect: { current: { initial: clientRect, translated: clientRect } },
    },
    over: {
      id: overId,
      data: { current: undefined },
      rect: clientRect,
      disabled: false,
    },
    activatorEvent: new Event('pointerup'),
    collisions: null,
    delta: { x: 0, y: 0 },
  };
}

describe('useOptimisticReorder', () => {
  it('sends the full ordered id list and rolls back on error', async () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const applyOptimistic = vi.fn();
    const commit = vi
      .fn()
      .mockResolvedValueOnce({ error: new Error('fail') })
      .mockResolvedValueOnce({});

    const { result, rerender } = renderHook(
      (props: { items: { id: string }[] }) =>
        useOptimisticReorder({
          items: props.items,
          canManage: true,
          commit,
          applyOptimistic,
        }),
      { initialProps: { items } },
    );

    await act(async () => {
      result.current.onDragEnd(mockDragEndEvent('c', 'a'));
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });

    expect(applyOptimistic).toHaveBeenCalledWith([{ id: 'c' }, { id: 'a' }, { id: 'b' }]);
    expect(commit).toHaveBeenCalledWith(['c', 'a', 'b']);
    expect(applyOptimistic).toHaveBeenCalledWith(items);

    rerender({ items });
    applyOptimistic.mockClear();
    commit.mockClear();

    await act(async () => {
      result.current.onDragEnd(mockDragEndEvent('b', 'a'));
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });

    expect(commit).toHaveBeenCalledWith(['b', 'a', 'c']);
    expect(applyOptimistic).toHaveBeenCalledTimes(1);
  });
});
