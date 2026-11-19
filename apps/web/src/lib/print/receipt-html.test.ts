import { describe, expect, it } from 'vitest';

import { orderMoneyFormatter, paymentCashLabels } from '../money.js';

import { buildPrintDocumentHtml, printLocaleFromUi } from './print-document.js';
import { renderReceiptHtml } from './receipt-html.js';

const baseMenu = {
  branch: {
    id: '01932a1a-7b3e-7000-8000-000000000030',
    name: 'Olaya',
    currency: 'SAR',
    taxRateBp: 1500,
    taxInclusive: true,
    timezone: 'Asia/Riyadh',
    receiptHeader: 'Welcome',
    receiptFooter: 'Thank you',
    address: 'King Fahd Rd',
    payBeforeSend: false,
    acceptsCard: true,
    pagerEnabled: false,
  },
  org: { name: 'Demo Restaurant', logoUrl: null },
  categories: [],
  display: null,
  displayRateUpdatedAt: null,
};

const baseOrder = {
  id: '01932a1a-7b3e-7000-8000-000000000060',
  orgId: '01932a1a-7b3e-7000-8000-000000000010',
  branchId: '01932a1a-7b3e-7000-8000-000000000030',
  clientOrderId: '01932a1a-7b3e-7000-8000-000000000061',
  orderNumber: 42,
  businessDate: '2026-04-01',
  type: 'takeaway' as const,
  status: 'ready' as const,
  paymentStatus: 'paid' as const,
  paidMinor: 1150,
  dueMinor: 0,
  tableId: null,
  billId: null,
  customerName: 'Sara',
  pagerNumber: null,
  notes: null,
  subtotalMinor: 1000,
  discountMinor: 0,
  taxMinor: 150,
  totalMinor: 1150,
  currency: 'SAR',
  display: null,
  version: 2,
  placedAt: '2026-04-01T10:00:00.000Z',
  completedAt: null,
  cancelledAt: null,
  cancelReason: null,
  createdAt: '2026-04-01T10:00:00.000Z',
  updatedAt: '2026-04-01T10:05:00.000Z',
  items: [
    {
      id: '01932a1a-7b3e-7000-8000-000000000070',
      productId: '01932a1a-7b3e-7000-8000-000000000040',
      productNameSnapshot: { en: 'Latte' },
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
  payments: [
    {
      id: '01932a1a-7b3e-7000-8000-000000000080',
      method: 'cash' as const,
      amountMinor: 1150,
      tenderedMinor: 2000,
      changeMinor: 850,
      displayTenderedMinor: null,
      displayChangeMinor: null,
      createdAt: '2026-04-01T10:04:00.000Z',
    },
  ],
};

const receiptLabels = {
  subtotal: 'Subtotal',
  tax: 'Tax',
  taxInclusiveSuffix: '(incl.)',
  total: 'Total',
  orderNumber: 'Order #42',
  dineIn: 'Dine in',
  takeaway: 'Takeaway',
  paymentMethodCash: 'Cash',
  paymentMethodCard: 'Card',
  paymentMethodOther: 'Other',
  tendered: 'Tendered',
  change: 'Change',
};

describe('renderReceiptHtml', () => {
  it('prints the frozen display currency and the cash the cashier counted', () => {
    // 11.50 at 13,000 = 149,500 SYP; customer hands over 150,000.
    const order = {
      ...baseOrder,
      currency: 'USD',
      display: { currency: 'SYP', rate: 13000, itemStep: 100, totalStep: 500 },
      payments: [
        {
          id: '01932a1a-7b3e-7000-8000-000000000081',
          method: 'cash' as const,
          amountMinor: 1150,
          createdAt: '2026-04-01T10:04:00.000Z',
          tenderedMinor: 1154,
          changeMinor: 4,
          displayTenderedMinor: 150_000,
          displayChangeMinor: 500,
        },
      ],
    };
    const body = renderReceiptHtml({
      order,
      menu: baseMenu,
      tableLabel: null,
      locale: 'en',
      fallbackLocale: 'en',
      formatMinor: orderMoneyFormatter(order, 'en'),
      cashLabels: (payment) => paymentCashLabels(payment, order, 'en'),
      printedAt: new Date('2026-04-01T10:05:00.000Z'),
      labels: receiptLabels,
    });
    expect(body).toContain('<span>Total</span><span>149,500 SYP</span>');
    expect(body).toContain('<span>Tendered</span><span>150,000 SYP</span>');
    expect(body).toContain('<span>Change</span><span>500 SYP</span>');
    expect(body).not.toContain('$');
  });

  it('includes tax inclusive label and cash change', () => {
    const body = renderReceiptHtml({
      order: baseOrder,
      menu: baseMenu,
      tableLabel: null,
      locale: 'en',
      fallbackLocale: 'en',
      formatMinor: (m) => `SAR ${String(m / 100)}`,
      cashLabels: (payment) => paymentCashLabels(payment, baseOrder, 'en'),
      printedAt: new Date('2026-04-01T10:05:00.000Z'),
      labels: {
        subtotal: 'Subtotal',
        tax: 'Tax',
        taxInclusiveSuffix: '(incl.)',
        total: 'Total',
        orderNumber: 'Order #42',
        dineIn: 'Dine in',
        takeaway: 'Takeaway',
        paymentMethodCash: 'Cash',
        paymentMethodCard: 'Card',
        paymentMethodOther: 'Other',
        tendered: 'Tendered',
        change: 'Change',
      },
    });
    expect(body).toContain('Tax (incl.)');
    expect(body).toContain('Change');
    expect(body).toContain('Demo Restaurant');
    expect(body).toContain('King Fahd Rd');
  });

  it('sets rtl on print document for Arabic locale', () => {
    const doc = buildPrintDocumentHtml({
      title: 'Receipt',
      bodyHtml: '<p>x</p>',
      locale: printLocaleFromUi('ar'),
    });
    expect(doc).toContain('lang="ar"');
    expect(doc).toContain('dir="rtl"');
  });
});
