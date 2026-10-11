import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockToDataUrlCalls, resetMockToDataUrlCalls } from '../test/mocks/qrcode.js';

import { QR_DOWNLOAD_PX } from './qr-code-sizes.js';
import { downloadQrPng } from './download-qr-png.js';

describe('downloadQrPng', () => {
  beforeEach(() => {
    resetMockToDataUrlCalls();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('generates a 1024px QR on download', async () => {
    await downloadQrPng('https://menu.example/en/m/demo', 'menu-qr.png');
    expect(mockToDataUrlCalls.length).toBe(1);
    const call = mockToDataUrlCalls[0];
    expect(call?.text).toBe('https://menu.example/en/m/demo');
    expect(call?.width).toBe(QR_DOWNLOAD_PX);
    expect(call?.width).toBe(1024);
  });
});
