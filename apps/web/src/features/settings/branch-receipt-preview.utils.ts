import type { OrderDetail, PosMenuPayload } from '@app/shared';

import { buildPrintDocumentHtml, printLocaleFromUi } from '../../lib/print/print-document.js';
import { renderReceiptHtml, type ReceiptPrintLabels } from '../../lib/print/receipt-html.js';

/** Paper-on-gray look for the on-screen preview only; real printing ignores this. */
const PREVIEW_CSS = `
html { background: #eef0ec; }
body { width: auto; padding: 16px; display: flex; justify-content: center; }
.paper { width: 100%; max-width: 300px; background: #fff; padding: 18px 16px; border-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,.15); font-size: 13px; line-height: 1.6; }
h1 { font-size: 17px; }
`;

export function branchReceiptPreviewHtml(input: {
  branchName: string;
  orgName: string;
  orgLogoUrl: string | null;
  currency: string;
  taxRateBp: number;
  taxInclusive: boolean;
  timezone: string;
  receiptHeader: string | null;
  receiptFooter: string | null;
  address: string | null;
  locale: string;
  labels: ReceiptPrintLabels;
  formatMinor: (minor: number) => string;
}): string {
  const menu: PosMenuPayload = {
    branch: {
      id: '00000000-0000-4000-8000-000000000030',
      name: input.branchName,
      currency: input.currency,
      taxRateBp: input.taxRateBp,
      taxInclusive: input.taxInclusive,
      timezone: input.timezone,
      receiptHeader: input.receiptHeader,
      receiptFooter: input.receiptFooter,
      address: input.address,
      payBeforeSend: false,
      acceptsCard: true,
      pagerEnabled: false,
    },
    org: { name: input.orgName, logoUrl: input.orgLogoUrl },
    categories: [],
    display: null,
    displayRateUpdatedAt: null,
  };

  const order: OrderDetail = {
    id: '00000000-0000-4000-8000-000000000060',
    orgId: '00000000-0000-4000-8000-000000000010',
    branchId: menu.branch.id,
    clientOrderId: '00000000-0000-4000-8000-000000000061',
    orderNumber: 1,
    businessDate: '2026-04-01',
    type: 'takeaway' as const,
    status: 'ready' as const,
    paymentStatus: 'paid' as const,
    paidMinor: 1150,
    dueMinor: 0,
    tableId: null,
    billId: null,
    customerName: null,
    pagerNumber: null,
    notes: null,
    subtotalMinor: 1000,
    discountMinor: 0,
    taxMinor: 150,
    totalMinor: 1150,
    currency: input.currency,
    display: null,
    version: 1,
    placedAt: '2026-04-01T10:00:00.000Z',
    completedAt: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
    items: [
      {
        id: '00000000-0000-4000-8000-000000000070',
        productId: '00000000-0000-4000-8000-000000000040',
        productNameSnapshot: { en: 'Sample item', ar: 'صنف تجريبي' },
        unitPriceMinor: 1000,
        quantity: 1,
        lineTotalMinor: 1000,
        notes: null,
        status: 'ready' as const,
        isAddition: false,
        seat: null,
        voidedAt: null,
        voidReason: null,
        modifiers: [],
      },
    ],
    payments: [],
  };

  const bodyHtml = renderReceiptHtml({
    order,
    menu,
    tableLabel: null,
    locale: input.locale,
    fallbackLocale: 'en',
    formatMinor: input.formatMinor,
    cashLabels: () => ({ tendered: null, change: null }),
    printedAt: new Date('2026-04-01T10:05:00.000Z'),
    labels: input.labels,
  });

  return buildPrintDocumentHtml({
    title: input.branchName,
    bodyHtml: `<div class="paper">${bodyHtml}</div>`,
    locale: printLocaleFromUi(input.locale),
    extraCss: PREVIEW_CSS,
  });
}
