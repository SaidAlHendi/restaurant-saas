import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

// jsdom lacks these browser APIs; Radix primitives and use-theme call them.
const noop = () => undefined;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: noop,
      removeEventListener: noop,
      addListener: noop,
      removeListener: noop,
      dispatchEvent: () => false,
    }) as MediaQueryList,
});
Object.assign(Element.prototype, {
  hasPointerCapture: () => false,
  setPointerCapture: noop,
  releasePointerCapture: noop,
  scrollIntoView: noop,
});
Object.assign(globalThis, {
  ResizeObserver: class {
    observe = noop;
    unobserve = noop;
    disconnect = noop;
  },
});
