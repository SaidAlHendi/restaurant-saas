import { afterEach, describe, expect, it, vi } from 'vitest';

import { openPrintWindow } from './open-print-window.js';

describe('openPrintWindow', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('creates a hidden iframe and calls print on load, after the UI repaints', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    const printMock = vi.fn();
    const iframe = {
      style: {} as CSSStyleDeclaration,
      setAttribute: vi.fn(),
      addEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === 'load') {
          handler();
        }
      }),
      remove: vi.fn(),
      isConnected: true,
      srcdoc: '',
      contentWindow: {
        focus: vi.fn(),
        print: printMock,
        addEventListener: vi.fn(),
      },
    };

    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockReturnValue(iframe as unknown as HTMLIFrameElement);
    vi.spyOn(document.body, 'append').mockImplementation(() => undefined);

    openPrintWindow('Receipt', '<p>Test</p>', { lang: 'en', dir: 'ltr' });

    expect(createElementSpy).toHaveBeenCalledWith('iframe');
    expect(printMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(printMock).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1_000);
    expect(iframe.remove).toHaveBeenCalled();
  });
});
