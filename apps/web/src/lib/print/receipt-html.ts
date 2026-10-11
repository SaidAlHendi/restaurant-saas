import type { OrderDetail, Payment, PosMenuPayload } from '@app/shared';

import { escapeHtml } from './escape-html.js';
import { formatPrintDateTime } from './print-document.js';
import { activeOrderItems } from './kitchen-addition-diff.js';
import { formatOrderMetaLine, renderReceiptItemLinesHtml } from './print-label.utils.js';

export type ReceiptPrintLabels = {
  subtotal: string;
  tax: string;
  taxInclusiveSuffix: string;
  total: string;
  orderNumber: string;
  dineIn: string;
  takeaway: string;
  paymentMethodCash: string;
  paymentMethodCard: string;
  paymentMethodOther: string;
  tendered: string;
  change: string;
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

function paymentMethodLabel(payment: Payment, labels: ReceiptPrintLabels): string {
  if (payment.method === 'cash') {
    return labels.paymentMethodCash;
  }
  if (payment.method === 'card') {
    return labels.paymentMethodCard;
  }
  return labels.paymentMethodOther;
}

function renderPaymentsHtml(
  payments: Payment[],
  labels: ReceiptPrintLabels,
  formatMinor: (minor: number) => string,
): string {
  if (payments.length === 0) {
    return '';
  }
  return payments
    .map((payment) => {
      const method = escapeHtml(paymentMethodLabel(payment, labels));
      const amount = escapeHtml(formatMinor(payment.amountMinor));
      const lines = [`<div class="line"><span>${method}</span><span>${amount}</span></div>`];
      if (payment.method === 'cash' && payment.tenderedMinor !== null) {
        lines.push(
          `<div class="line"><span>${escapeHtml(labels.tendered)}</span><span>${escapeHtml(formatMinor(payment.tenderedMinor))}</span></div>`,
        );
      }
      if (payment.method === 'cash' && payment.changeMinor !== null && payment.changeMinor > 0) {
        lines.push(
          `<div class="line"><span>${escapeHtml(labels.change)}</span><span>${escapeHtml(formatMinor(payment.changeMinor))}</span></div>`,
        );
      }
      return lines.join('');
    })
    .join('<hr />');
}

export function renderReceiptHtml(ctx: ReceiptPrintContext): string {
  const { order, menu, tableLabel, locale, fallbackLocale, formatMinor, printedAt, labels } = ctx;
  const orgName = escapeHtml(menu.org.name);
  const branchName = escapeHtml(menu.branch.name);
  const address =
    menu.branch.address !== null && menu.branch.address.length > 0
      ? `<div class="meta">${escapeHtml(menu.branch.address)}</div>`
      : '';
  const customHeader =
    menu.branch.receiptHeader !== null && menu.branch.receiptHeader.length > 0
      ? `<div class="meta bold">${escapeHtml(menu.branch.receiptHeader)}</div>`
      : '';
  const footer =
    menu.branch.receiptFooter !== null && menu.branch.receiptFooter.length > 0
      ? `<hr /><div class="meta">${escapeHtml(menu.branch.receiptFooter)}</div>`
      : '';

  const items = activeOrderItems(order);
  const itemHtml = renderReceiptItemLinesHtml(items, locale, fallbackLocale, formatMinor);
  const meta = escapeHtml(formatOrderMetaLine(order, tableLabel, labels));
  const timeLabel = escapeHtml(
    formatPrintDateTime({
      date: printedAt,
      timeZone: menu.branch.timezone,
      locale,
    }),
  );
  const orderNo = escapeHtml(labels.orderNumber);
  const taxLabel =
    menu.branch.taxInclusive && labels.taxInclusiveSuffix.length > 0
      ? `${labels.tax} ${labels.taxInclusiveSuffix}`
      : labels.tax;

  return `
<h1>${orgName}</h1>
<div class="meta">${branchName}</div>
${address}
${customHeader}
<div class="meta bold">${orderNo}</div>
<div class="meta">${timeLabel}</div>
<div class="meta">${meta}</div>
<hr />
${itemHtml}
<hr />
<div class="line"><span>${escapeHtml(labels.subtotal)}</span><span>${escapeHtml(formatMinor(order.subtotalMinor))}</span></div>
<div class="line"><span>${escapeHtml(taxLabel)}</span><span>${escapeHtml(formatMinor(order.taxMinor))}</span></div>
<div class="line bold"><span>${escapeHtml(labels.total)}</span><span>${escapeHtml(formatMinor(order.totalMinor))}</span></div>
${renderPaymentsHtml(order.payments, labels, formatMinor)}
${footer}
`;
}
