import type { OrderDetail, OrderItem } from '@app/shared';

import { formatOrderMetaLine, renderItemLinesHtml } from './print-label.utils.js';

export type KitchenPrintContext = {
  order: OrderDetail;
  items: OrderItem[];
  tableLabel: string | null;
  locale: string;
  fallbackLocale: string;
  title: string;
  isAdditionTicket: boolean;
};

export function renderKitchenHtml(ctx: KitchenPrintContext): string {
  const { order, items, tableLabel, locale, fallbackLocale, title, isAdditionTicket } = ctx;
  if (items.length === 0) {
    return `<p class="meta">${title}</p>`;
  }
  const meta = formatOrderMetaLine(order, tableLabel);
  const badge = isAdditionTicket ? `<div class="meta bold">${title}</div>` : `<h1>${title}</h1>`;
  const itemHtml = renderItemLinesHtml(items, locale, fallbackLocale);
  const note =
    order.notes && order.notes.length > 0
      ? `<hr /><div class="bold">${order.notes}</div>`
      : '';

  return `
${badge}
<div class="meta">${meta}</div>
<hr />
${itemHtml}
${note}
`;
}
