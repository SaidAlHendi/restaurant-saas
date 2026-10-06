import { act, render, renderHook, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchInput } from './search-input.js';
import { useDebouncedValue } from '../../hooks/use-debounced-value.js';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates only after the value stops changing', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'ab' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ value: 'abc' });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('a');
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('abc');
  });
});

describe('SearchInput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup() {
    const onValueChange = vi.fn();
    render(
      <SearchInput
        aria-label="Search orders"
        onValueChange={onValueChange}
        delay={300}
        clearLabel="Clear search"
      />,
    );
    return { onValueChange, input: screen.getByRole('searchbox', { name: 'Search orders' }) };
  }

  it('calls onValueChange once, after typing pauses, with trimmed text', () => {
    const { onValueChange, input } = setup();
    fireEvent.change(input, { target: { value: 's' } });
    fireEvent.change(input, { target: { value: 'sha' } });
    fireEvent.change(input, { target: { value: 'shawarma ' } });
    expect(onValueChange).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith('shawarma');
  });

  it('clears at once with the button or Escape', () => {
    const { onValueChange, input } = setup();
    fireEvent.change(input, { target: { value: 'tea' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onValueChange).toHaveBeenLastCalledWith('');
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: 'tea' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('');
    expect(onValueChange).toHaveBeenLastCalledWith('');
  });
});
