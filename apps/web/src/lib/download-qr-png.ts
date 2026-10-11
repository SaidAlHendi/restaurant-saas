import { QR_DOWNLOAD_PX } from './qr-code-sizes.js';
import { downloadDataUrl, qrCodeToDataUrl } from './qr-code-data-url.js';

export async function downloadQrPng(url: string, fileName: string): Promise<void> {
  const dataUrl = await qrCodeToDataUrl(url, QR_DOWNLOAD_PX);
  downloadDataUrl(dataUrl, fileName);
}
