import { useCallback, useSyncExternalStore } from 'react';

export const THEMES = ['cupcake', 'forest'] as const;
export type Theme = (typeof THEMES)[number];

export const LIGHT_THEME: Theme = 'cupcake';
export const DARK_THEME: Theme = 'forest';
/** localStorage key; apps/web/index.html reads the same key before React loads. */
export const THEME_STORAGE_KEY = 'app.theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

function writeStoredTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked (private mode); the theme still applies for this visit.
  }
}

function systemTheme(): Theme {
  return window.matchMedia(DARK_QUERY).matches ? DARK_THEME : LIGHT_THEME;
}

/** Saved choice first, otherwise the OS preference. */
export function resolveInitialTheme(): Theme {
  return readStoredTheme() ?? systemTheme();
}

let currentTheme: Theme | null = null;
const listeners = new Set<() => void>();

function applyTheme(theme: Theme): void {
  currentTheme = theme;
  document.documentElement.dataset.theme = theme;
  listeners.forEach((listener) => {
    listener();
  });
}

function getTheme(): Theme {
  if (currentTheme === null) {
    applyTheme(resolveInitialTheme());
  }
  return currentTheme ?? LIGHT_THEME;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const media = window.matchMedia(DARK_QUERY);
  // Follow the OS only while the user has not chosen a theme.
  const onSystemChange = () => {
    if (readStoredTheme() === null) applyTheme(systemTheme());
  };
  // Keep tabs in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY && isTheme(event.newValue)) applyTheme(event.newValue);
  };
  media.addEventListener('change', onSystemChange);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    media.removeEventListener('change', onSystemChange);
    window.removeEventListener('storage', onStorage);
  };
}

/** Sets and saves the theme outside React (e.g. after loading the user's profile). */
export function setTheme(theme: Theme): void {
  writeStoredTheme(theme);
  applyTheme(theme);
}

/** Test helper: forget the in-memory theme so the next read resolves it again. */
export function resetThemeForTests(): void {
  currentTheme = null;
}

export interface UseThemeOptions {
  /** Called after the user changes the theme, e.g. to save it to their profile. */
  onChange?: (theme: Theme) => void;
}

export interface UseThemeResult {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export function useTheme({ onChange }: UseThemeOptions = {}): UseThemeResult {
  const theme = useSyncExternalStore(subscribe, getTheme, () => LIGHT_THEME);

  const change = useCallback(
    (next: Theme) => {
      setTheme(next);
      onChange?.(next);
    },
    [onChange],
  );

  const toggleTheme = useCallback(() => {
    change(getTheme() === DARK_THEME ? LIGHT_THEME : DARK_THEME);
  }, [change]);

  return { theme, setTheme: change, toggleTheme };
}
