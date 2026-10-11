import type { OrderDetail, OrderItem } from '@app/shared';

export function localizedPrintName(
  snapshot: Record<string, string>,
  locale: string,
  fallbackLocale: string,
): string {
  return snapshot[locale] ?? snapshot[fallbackLocale] ?? Object.values(snapshot)[0] ?? '';
}

export function formatOrderMetaLine(order: OrderDetail, tableLabel: string | null): string {
  const parts: string[] = [`#${String(order.orderNumber)}`];
  if (order.type === 'dine_in' && tableLabel) {
    parts.push(tableLabel);
  }
  if (order.type === 'takeaway' && order.customerName) {
    parts.push(order.customerName);
  }
  return parts.join(' · ');
}

export function renderItemLinesHtml(
  items: OrderItem[],
  locale: string,
  fallbackLocale: string,
): string {
  return items
    .map((item) => {
      const name = localizedPrintName(item.productNameSnapshot, locale, fallbackLocale);
      const qty = String(item.quantity);
      const modLabels = item.modifiers.map((m) =>
        localizedPrintName(m.nameSnapshot, locale, fallbackLocale),
      );
      const mods =
        modLabels.length > 0 ? `<div class="mods">${modLabels.join(', ')}</div>` : '';
      const note =
        item.notes !== null && item.notes.length > 0
          ? `<div class="mods">${item.notes}</div>`
          : '';
      return `<div class="line bold"><span class="line-name">${qty}× ${name}</span></div>${mods}${note}`;
    })
    .join('');
}
