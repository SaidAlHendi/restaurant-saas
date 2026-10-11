import { toDataURL } from 'qrcode';

export function qrCodeToDataUrl(text: string): Promise<string> {
  return toDataURL(text, { margin: 1, width: 256, errorCorrectionLevel: 'M' });
}

export function downloadDataUrl(dataUrl: string, fileName: string): void {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = fileName;
  anchor.click();
}
