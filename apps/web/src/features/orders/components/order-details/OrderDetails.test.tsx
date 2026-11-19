import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { OrderDetail, OrderEvent } from '@app/shared';

import { i18n, initI18n } from '../../../../lib/i18n.js';
import { moneyFormatter } from '../../../../lib/money.js';
import {
  PosOrderDetailSheetView,
  type PosOrderDetailSheetViewProps,
} from '../../../pos/components/PosOrderDetailSheetView.js';
import { posDetailActionLayout } from '../../../pos/pos-order-detail.utils.js';
import { buildOrderDetailsModel } from './order-details.model.js';
import { OrderDetailsBodyView } from './OrderDetailsBodyView.js';
import { orderDetailsBodyLabels } from './order-details.labels.js';
import { OrderDetailsHeaderView } from './OrderDetailsHeaderView.js';

// The PIN-approval dialog has its own tests; here it is just out of the way.
vi.mock('../../../pos/components/PosOrderActionDialogView.js', () => ({
  PosOrderActionDialogView: () => null,
}));

const ID = '01932a1a-7b3e-7000-8000-0000000000';

function makeOrder(overrides: Partial<OrderDetail> = {}): OrderDetail {
  return {
    id: `${ID}01`,
    orgId: `${ID}02`,
    branchId: `${ID}03`,
    clientOrderId: `${ID}04`,
    orderNumber: 12,
    businessDate: '2026-03-01',
    type: 'dine_in',
    status: 'preparing',
    paymentStatus: 'unpaid',
    paidMinor: 0,
    dueMinor: 1500,
    tableId: `${ID}05`,
    billId: null,
    customerName: null,
    pagerNumber: null,
    notes: null,
    version: 3,
    placedAt: '2026-03-01T12:00:00.000Z',
    completedAt: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: '2026-03-01T11:59:00.000Z',
    updatedAt: '2026-03-01T12:01:00.000Z',
    subtotalMinor: 1500,
    discountMinor: 0,
    taxMinor: 0,
    totalMinor: 1500,
    currency: 'USD',
    display: null,
    items: [
      {
        id: `${ID}10`,
        productId: `${ID}11`,
        productNameSnapshot: { en: 'Falafel wrap' },
        unitPriceMinor: 750,
        quantity: 2,
        lineTotalMinor: 1500,
        notes: 'No onion',
        status: 'preparing',
        isAddition: true,
        seat: '1',
        voidedAt: null,
        voidReason: null,
        modifiers: [
          { id: `${ID}12`, modifierId: `${ID}13`, nameSnapshot: { en: 'Extra sauce' }, priceDeltaMinor: 50 },
        ],
      },
    ],
    payments: [],
    ...overrides,
  };
}

function build(order: OrderDetail, events?: OrderEvent[], showVersion = false) {
  return buildOrderDetailsModel({
    order,
    events,
    t: i18n.t.bind(i18n),
    uiLocale: i18n.language,
    intlLocale: i18n.language === 'ar' ? 'ar-SA' : 'en-US',
    contentLocale: i18n.language,
    defaultLocale: 'en',
    formatMinor: moneyFormatter(order.currency, 'en', order.display),
    tableLabel: 'T4',
    showVersion,
  });
}

beforeAll(async () => {
  await initI18n();
  await i18n.changeLanguage('en');
});
afterEach(cleanup);

function renderBody(order: OrderDetail, events?: OrderEvent[], showVersion = false) {
  const model = build(order, events, showVersion);
  return render(
    <div dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <OrderDetailsHeaderView
        header={model.header}
        stepper={model.stepper}
        labels={{ orderNumber: '#12', progress: 'Progress', business: 'Business date', created: 'Created', due: 'Due' }}
      />
      <OrderDetailsBodyView
        model={model}
        labels={orderDetailsBodyLabels(i18n.t.bind(i18n))}
        timeline={{ collapsible: false, loading: false }}
      />
    </div>,
  );
}

describe('order details model', () => {
  it('hides fields that are empty and shows the ones that are set', () => {
    const model = build(makeOrder());
    const keys = model.info.map((r) => r.key);
    expect(keys).not.toContain('customer');
    expect(keys).not.toContain('notes');
    expect(keys).not.toContain('pager');
    expect(keys).not.toContain('version');
    expect(model.timestamps.map((r) => r.key)).toEqual(['created', 'placed']);
    const full = build(makeOrder({ customerName: 'Sam', notes: 'Window seat', pagerNumber: 7 }), undefined, true);
    expect(full.info.map((r) => r.key)).toEqual(
      expect.arrayContaining(['customer', 'notes', 'pager', 'version']),
    );
  });

  it('adds the base-currency total and frozen rate when the order has a display currency', () => {
    const order = makeOrder({ display: { currency: 'SYP', rate: 13000, itemStep: 0, totalStep: 0 } });
    const model = build(order);
    expect(model.totals.rate?.value).toBe('1 USD = 13,000 SYP');
    expect(model.totals.baseTotal?.value).toContain('15.00');
    expect(build(makeOrder()).totals.rate).toBeNull();
  });

  it('falls back to another language for a product name', () => {
    const order = makeOrder();
    const [line] = order.items;
    if (line) {
      line.productNameSnapshot = { fr: 'Wrap falafel' };
    }
    expect(build(order).items.groups[0]?.items[0]?.name).toBe('Wrap falafel');
  });

  it('labels reopen and undo events', () => {
    const base = {
      orderId: `${ID}01`,
      actorMembershipId: `${ID}20`,
      actorName: 'Alex',
      approvedByMembershipId: null,
      approverName: null,
      fromStatus: 'completed' as const,
      toStatus: 'ready' as const,
    };
    const events: OrderEvent[] = [
      { ...base, id: `${ID}30`, type: 'order.status_changed', payload: { reopen: true, reason: 'Wrong table' }, createdAt: '2026-03-01T12:05:00.000Z' },
      { ...base, id: `${ID}31`, type: 'order.status_changed', toStatus: 'preparing', payload: { undo: true }, createdAt: '2026-03-01T12:06:00.000Z' },
    ];
    const rows = build(makeOrder(), events).timeline.rows;
    expect(rows[0]?.label).toBe('Order reopened: Completed → Ready');
    expect(rows[0]?.reason).toBe('Wrong table');
    expect(rows[1]?.label).toBe('Undone: back to Preparing');
  });
});

describe('order details views', () => {
  it.each(['draft', 'placed', 'preparing', 'ready', 'completed', 'cancelled'] as const)(
    'renders a %s order',
    (status) => {
      renderBody(makeOrder({ status, cancelReason: status === 'cancelled' ? 'Guest left' : null }));
      expect(screen.getByTestId('order-details-header')).toBeTruthy();
      expect(screen.getByText('Falafel wrap', { exact: false })).toBeTruthy();
      if (status === 'cancelled') {
        expect(screen.getByText('Cancelled: Guest left')).toBeTruthy();
      }
      if (status === 'draft') {
        expect(screen.getAllByText('Awaiting payment').length).toBeGreaterThan(0);
      }
    },
  );

  it('shows modifiers, note, seat group, added-later chip and an empty payments state', () => {
    renderBody(makeOrder());
    expect(screen.getByText(/Extra sauce/)).toBeTruthy();
    expect(screen.getByText('“No onion”')).toBeTruthy();
    expect(screen.getByText('Guest 1')).toBeTruthy();
    expect(screen.getByText('Added later')).toBeTruthy();
    expect(screen.getByText('No payments yet')).toBeTruthy();
  });

  it('strikes through a voided line and shows why', () => {
    const order = makeOrder();
    Object.assign(order.items[0] ?? {}, { status: 'voided', voidReason: 'Wrong item', voidedAt: '2026-03-01T12:03:00.000Z' });
    renderBody(order);
    expect(screen.getByText(/Wrong item/)).toBeTruthy();
    expect(screen.getByText('Voided')).toBeTruthy();
  });

  it('renders in RTL Arabic without crashing', async () => {
    await i18n.changeLanguage('ar');
    renderBody(makeOrder());
    expect(screen.getByRole('region', { name: 'الأصناف' })).toBeTruthy();
    await i18n.changeLanguage('en');
  });
});

describe('POS sheet actions', () => {
  function sheet(order: OrderDetail, canReopen: boolean) {
    const model = build(order);
    const layout = posDetailActionLayout({ order, canAddItems: false, canCancel: true, canReopen });
    const noop = () => undefined;
    const labels = {
      ...orderDetailsBodyLabels(i18n.t.bind(i18n)),
      progress: 'Progress', business: 'Business date', created: 'Created', dueLabel: 'Due', startPreparing: 'Start preparing',
      markReady: 'Mark ready', handover: 'Served', manager: 'Manager', moreActions: 'More actions', loading: 'Loading',
      loadFailed: 'Failed', title: 'Order', orderNumber: '#12', pay: 'Pay', addItems: 'Add items', more: 'More',
      cancelOrder: 'Cancel order', printReceipt: 'Print receipt', printKitchen: 'Print kitchen ticket', close: 'Close',
    };
    const dialog = { open: false, onOpenChange: noop } as never;
    const props = {
      open: true, onOpenChange: noop, order, orderLoadFailed: false, details: model, layout,
      timeline: { loading: false, onToggle: noop }, startAddItems: noop,
      reopen: { open: false, openDialog: noop, close: noop, reason: '', onReasonChange: noop, confirm: () => Promise.resolve(), submitting: false, reasonMax: 200, labels: { action: 'Reopen order', title: 't', body: 'b', reason: 'r', confirm: 'c', cancel: 'x' } },
      voidDialog: dialog, cancelDialog: dialog, openCancelDialog: noop, printReceipt: noop, printKitchenFull: noop,
      onStartPreparing: noop, onMarkReady: noop, onComplete: noop, statusChanging: false, labels, onPay: noop,
    };
    return render(<PosOrderDetailSheetView {...(props as unknown as PosOrderDetailSheetViewProps)} />);
  }

  it.each([
    ['placed', 'Start preparing'],
    ['preparing', 'Mark ready'],
    ['ready', 'Served'],
  ] as const)('%s shows %s as the primary action', (status, label) => {
    sheet(makeOrder({ status }), false);
    expect(screen.getByRole('button', { name: label })).toBeTruthy();
  });

  it('draft with a balance leads with Pay; completed has no primary action', () => {
    sheet(makeOrder({ status: 'draft' }), false);
    expect(screen.getByRole('button', { name: 'Pay' })).toBeTruthy();
    cleanup();
    sheet(makeOrder({ status: 'completed', dueMinor: 0, paymentStatus: 'paid' }), false);
    expect(screen.queryByRole('button', { name: 'Served' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pay' })).toBeNull();
  });

  it('shows Reopen in the Manager section only with permission on a completed order', () => {
    const completed = makeOrder({ status: 'completed', dueMinor: 0, paymentStatus: 'paid' });
    sheet(completed, true);
    fireEvent.keyDown(screen.getByRole('button', { name: 'More actions' }), { key: 'Enter' });
    const menu = screen.getByRole('menu');
    expect(within(menu).getByText('Manager')).toBeTruthy();
    expect(within(menu).getByText('Reopen order')).toBeTruthy();
    cleanup();
    sheet(completed, false);
    fireEvent.keyDown(screen.getByRole('button', { name: 'More actions' }), { key: 'Enter' });
    expect(screen.queryByText('Reopen order')).toBeNull();
  });
});
