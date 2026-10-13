import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePosPinPadKeyboard } from './use-pos-pin-pad-keyboard.js';

describe('usePosPinPadKeyboard', () => {
  it('handles digit keys, backspace, and enter', () => {
    const onDigit = vi.fn();
    const onBackspace = vi.fn();
    const onSubmit = vi.fn();

    renderHook(() => {
      usePosPinPadKeyboard({
        enabled: true,
        canSubmit: true,
        onDigit,
        onBackspace,
        onSubmit,
      });
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });

    expect(onDigit).toHaveBeenCalledWith('3');
    expect(onBackspace).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalled();
  });
});
