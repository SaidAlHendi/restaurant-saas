import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDisclosure } from './use-disclosure.js';

describe('useDisclosure', () => {
  it('works uncontrolled', () => {
    const { result } = renderHook(() => useDisclosure());
    expect(result.current.open).toBe(false);
    act(() => {
      result.current.toggle();
    });
    expect(result.current.open).toBe(true);
    act(() => {
      result.current.onClose();
    });
    expect(result.current.open).toBe(false);
  });

  it('reports changes and follows the open prop when controlled', () => {
    const onOpenChange = vi.fn();
    const { result, rerender } = renderHook(({ open }) => useDisclosure({ open, onOpenChange }), {
      initialProps: { open: false },
    });
    act(() => {
      result.current.toggle();
    });
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(result.current.open).toBe(false);
    rerender({ open: true });
    expect(result.current.open).toBe(true);
  });
});
