import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { THEME_STORAGE_KEY, resetThemeForTests, useTheme } from './use-theme.js';

function mockSystemDark(dark: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: dark && query.includes('dark'),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
}

describe('useTheme', () => {
  beforeEach(() => {
    resetThemeForTests();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to cupcake when the OS is light', () => {
    mockSystemDark(false);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('cupcake');
    expect(document.documentElement.dataset.theme).toBe('cupcake');
  });

  it('follows a dark OS on first visit', () => {
    mockSystemDark(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('forest');
  });

  it('prefers the saved choice over the OS', () => {
    mockSystemDark(true);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'cupcake');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('cupcake');
  });

  it('ignores an invalid saved value', () => {
    mockSystemDark(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('cupcake');
  });

  it('toggles, saves, sets data-theme and calls onChange', () => {
    mockSystemDark(false);
    const onChange = vi.fn();
    const { result } = renderHook(() => useTheme({ onChange }));
    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('forest');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('forest');
    expect(document.documentElement.dataset.theme).toBe('forest');
    expect(onChange).toHaveBeenCalledWith('forest');
  });

  it('keeps every hook instance in sync', () => {
    mockSystemDark(false);
    const a = renderHook(() => useTheme());
    const b = renderHook(() => useTheme());
    act(() => {
      a.result.current.setTheme('forest');
    });
    expect(b.result.current.theme).toBe('forest');
  });
});
