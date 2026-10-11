import type { OrderDetail, OrderItem } from '@app/shared';

import { escapeHtml } from './escape-html.js';
import { formatPrintDateTime } from './print-document.js';
import { formatOrderMetaLine, renderKitchenItemLinesHtml } from './print-label.utils.js';

export type KitchenPrintLabels = {
  dineIn: string;
  takeaway: string;
  additionHeader: string;
};

export type KitchenPrintContext = {
  order: OrderDetail;
  items: OrderItem[];
  tableLabel: string | null;
  locale: string;
  fallbackLocale: string;
  timeZone: string;
  printedAt: Date;
  title: string;
  isAdditionTicket: boolean;
  labels: KitchenPrintLabels;
};

export function renderKitchenHtml(ctx: KitchenPrintContext): string {
  const {
    order,
    items,
    tableLabel,
    locale,
    fallbackLocale,
    timeZone,
    printedAt,
    title,
    isAdditionTicket,
    labels,
  } = ctx;
  if (items.length === 0) {
    return `<p class="meta">${escapeHtml(title)}</p>`;
  }
  const meta = escapeHtml(formatOrderMetaLine(order, tableLabel, labels));
  const timeLabel = escapeHtml(
    formatPrintDateTime({ date: printedAt, timeZone, locale }),
  );
  const badge = isAdditionTicket
    ? `<div class="meta bold">${escapeHtml(labels.additionHeader)}</div>`
    : `<h1>${escapeHtml(title)}</h1>`;
  const itemHtml = renderKitchenItemLinesHtml(items, locale, fallbackLocale);
  const note =
    order.notes !== null && order.notes.length > 0
      ? `<hr /><div class="bold">${escapeHtml(order.notes)}</div>`
      : '';

  return `
${badge}
<div class="meta">${meta}</div>
<div class="meta">${timeLabel}</div>
<hr />
${itemHtml}
${note}
`;
}
