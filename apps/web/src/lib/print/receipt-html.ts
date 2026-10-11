import type { OrderDetail, PosMenuPayload } from '@app/shared';

import { formatOrderMetaLine, renderItemLinesHtml } from './print-label.utils.js';
import { activeOrderItems } from './kitchen-addition-diff.js';

export type ReceiptPrintLabels = {
  subtotal: string;
  tax: string;
  total: string;
  paid: string;
  due: string;
};

export type ReceiptPrintContext = {
  order: OrderDetail;
  menu: PosMenuPayload;
  tableLabel: string | null;
  locale: string;
  fallbackLocale: string;
  formatMinor: (minor: number) => string;
  printedAt: Date;
  labels: ReceiptPrintLabels;
};

export function renderReceiptHtml(ctx: ReceiptPrintContext): string {
  const { order, menu, tableLabel, locale, fallbackLocale, formatMinor, printedAt, labels } = ctx;
  const header = menu.branch.receiptHeader ?? menu.org.name;
  const footer = menu.branch.receiptFooter ?? '';
  const items = activeOrderItems(order);
  const itemHtml = renderItemLinesHtml(items, locale, fallbackLocale);
  const meta = formatOrderMetaLine(order, tableLabel);
  const timeLabel = printedAt.toLocaleString(locale.startsWith('ar') ? 'ar' : 'en');

  return `
<h1>${header}</h1>
<div class="meta">${meta}</div>
<div class="meta">${timeLabel}</div>
<hr />
${itemHtml}
<hr />
<div class="line"><span>${labels.subtotal}</span><span>${formatMinor(order.subtotalMinor)}</span></div>
<div class="line"><span>${labels.tax}</span><span>${formatMinor(order.taxMinor)}</span></div>
<div class="line bold"><span>${labels.total}</span><span>${formatMinor(order.totalMinor)}</span></div>
${order.paidMinor > 0 ? `<div class="line"><span>${labels.paid}</span><span>${formatMinor(order.paidMinor)}</span></div>` : ''}
${order.dueMinor > 0 ? `<div class="line"><span>${labels.due}</span><span>${formatMinor(order.dueMinor)}</span></div>` : ''}
${footer.length > 0 ? `<hr /><div class="meta">${footer}</div>` : ''}
`;
}
