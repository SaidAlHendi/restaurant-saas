import { buildPrintDocumentHtml, type PrintDocumentLocale } from './print-document.js';

export function openPrintWindow(
  title: string,
  bodyHtml: string,
  locale: PrintDocumentLocale,
): void {
  if (typeof document === 'undefined') {
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.append(iframe);

  const docHtml = buildPrintDocumentHtml({ title, bodyHtml, locale });
  iframe.srcdoc = docHtml;

  const cleanup = (): void => {
    iframe.remove();
  };

  const tryPrint = (): void => {
    const win = iframe.contentWindow;
    if (!win) {
      cleanup();
      return;
    }
    win.addEventListener('afterprint', cleanup, { once: true });
    win.focus();
    win.print();
    window.setTimeout(() => {
      if (iframe.isConnected) {
        cleanup();
      }
    }, 60_000);
  };

  iframe.addEventListener('load', tryPrint, { once: true });
}
