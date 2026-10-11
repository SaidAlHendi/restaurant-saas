import { afterEach, describe, expect, it, vi } from 'vitest';

import { openPrintWindow } from './open-print-window.js';

describe('openPrintWindow', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a hidden iframe and calls print on load', () => {
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
    expect(printMock).toHaveBeenCalledTimes(1);
  });
});
