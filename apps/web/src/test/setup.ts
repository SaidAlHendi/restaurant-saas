import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

// jsdom has no matchMedia; the theme hook (app shell) reads the OS color scheme through it.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  });
}

// The app defaults to Arabic; tests assert English text unless they pick a language themselves.
// Set at load (beforeAll hooks call initI18n early) and again per test (some tests clear storage).
window.localStorage.setItem('app.lang', 'en');
beforeEach(() => {
  window.localStorage.setItem('app.lang', 'en');
});
