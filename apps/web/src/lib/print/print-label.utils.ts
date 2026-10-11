import type { OrderDetail, OrderItem } from '@app/shared';

import { escapeHtml } from './escape-html.js';

export function localizedPrintName(
  snapshot: Record<string, string>,
  locale: string,
  fallbackLocale: string,
): string {
  return snapshot[locale] ?? snapshot[fallbackLocale] ?? Object.values(snapshot)[0] ?? '';
}

export function formatOrderMetaLine(
  order: OrderDetail,
  tableLabel: string | null,
  typeLabels: { dineIn: string; takeaway: string },
): string {
  const typeLabel = order.type === 'dine_in' ? typeLabels.dineIn : typeLabels.takeaway;
  const parts: string[] = [typeLabel];
  if (order.type === 'dine_in' && tableLabel) {
    parts.push(tableLabel);
  }
  if (order.type === 'takeaway' && order.customerName) {
    parts.push(order.customerName);
  }
  return parts.join(' · ');
}

export function renderKitchenItemLinesHtml(
  items: OrderItem[],
  locale: string,
  fallbackLocale: string,
): string {
  return items
    .map((item) => {
      const name = escapeHtml(localizedPrintName(item.productNameSnapshot, locale, fallbackLocale));
      const qty = String(item.quantity);
      const modLabels = item.modifiers.map((m) =>
        escapeHtml(localizedPrintName(m.nameSnapshot, locale, fallbackLocale)),
      );
      const mods =
        modLabels.length > 0 ? `<div class="mods">${modLabels.join(', ')}</div>` : '';
      const note =
        item.notes !== null && item.notes.length > 0
          ? `<div class="mods">${escapeHtml(item.notes)}</div>`
          : '';
      return `<div class="line bold"><span class="line-name">${qty}× ${name}</span></div>${mods}${note}`;
    })
    .join('');
}

export function renderReceiptItemLinesHtml(
  items: OrderItem[],
  locale: string,
  fallbackLocale: string,
  formatMinor: (minor: number) => string,
): string {
  return items
    .map((item) => {
      const name = escapeHtml(localizedPrintName(item.productNameSnapshot, locale, fallbackLocale));
      const qty = String(item.quantity);
      const lineTotal = escapeHtml(formatMinor(item.lineTotalMinor));
      const modLabels = item.modifiers.map((m) =>
        escapeHtml(localizedPrintName(m.nameSnapshot, locale, fallbackLocale)),
      );
      const mods =
        modLabels.length > 0 ? `<div class="mods">${modLabels.join(', ')}</div>` : '';
      const note =
        item.notes !== null && item.notes.length > 0
          ? `<div class="mods">${escapeHtml(item.notes)}</div>`
          : '';
      return `<div class="line bold"><span class="line-name">${qty}× ${name}</span><span>${lineTotal}</span></div>${mods}${note}`;
    })
    .join('');
}
