import { PRINT_80MM_STYLES } from './print-styles.js';

export function openPrintWindow(title: string, bodyHtml: string): void {
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) {
    return;
  }
  const doc = win.document;
  doc.title = title;
  const style = doc.createElement('style');
  style.textContent = PRINT_80MM_STYLES;
  doc.head.append(style);
  const body = doc.createElement('div');
  body.innerHTML = bodyHtml;
  doc.body.replaceChildren(body);
  win.focus();
  win.print();
}
