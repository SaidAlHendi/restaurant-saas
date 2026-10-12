import { describe, expect, it } from 'vitest';

import { DEFAULT_KDS_SETTINGS } from './kds-settings.utils.js';
import { boardItem, boardOrder } from './kds-test-fixtures.js';
import { buildKdsCard, type KdsCardLabels } from './kds-view.utils.js';

const labels: KdsCardLabels = {
  orderNumber: (n) => `#${String(n)}`,
  type: (type) => type,
  table: (label) => `Table ${label}`,
  added: 'ADDED',
  voided: 'VOID',
  start: 'Start',
  ready: 'Ready',
  awaitingPayment: 'Awaiting payment',
  readyForPickup: 'Waiting for cashier',
  age: (age) => `Waiting ${age}`,
};

const input = {
  nowMs: Date.parse('2026-10-11T12:12:00.000Z'),
  offsetMs: 0,
  settings: DEFAULT_KDS_SETTINGS,
  locale: 'ar',
  defaultLocale: 'en',
  labels,
};

describe('buildKdsCard', () => {
  it('shows table, Arabic names, modifiers, additions last and voided items', () => {
    const original = boardItem({
      name: { en: 'Burger', ar: 'برجر' },
      modifiers: [{ name: { en: 'Large', ar: 'كبير' } }],
    });
    const voided = boardItem({
      status: 'voided',
      voidedAt: '2026-10-11T12:01:00.000Z',
      voidReason: 'mistake',
    });
    const added = boardItem({ isAddition: true });
    const card = buildKdsCard(
      boardOrder({ type: 'dine_in', tableLabel: '5', items: [added, original, voided] }),
      input,
    );
    expect(card.subtitle).toBe('Table 5');
    expect(card.ageLabel).toBe('12:00');
    expect(card.ageLevel).toBe('amber');
    expect(card.items.map((i) => i.isAddition)).toEqual([false, false, true]);
    expect(card.items[0]?.name).toBe('برجر');
    expect(card.items[0]?.modifiers).toEqual(['كبير']);
    const v = card.items.find((i) => i.isVoided);
    expect(v?.canToggle).toBe(false);
    expect(v?.voidReason).toBe('mistake');
    expect(card.actionLabel).toBe('Start');
  });

  it('ready cards have no action and say whether the order is paid', () => {
    const unpaid = buildKdsCard(boardOrder({ status: 'ready', customerName: 'Sara' }), input);
    expect(unpaid.next).toBeNull();
    expect(unpaid.actionLabel).toBeNull();
    expect(unpaid.statusNote).toBe('Awaiting payment');
    expect(unpaid.subtitle).toBe('Sara');
    const paid = buildKdsCard(boardOrder({ status: 'ready', paymentStatus: 'paid' }), input);
    expect(paid.statusNote).toBe('Waiting for cashier');
    expect(
      buildKdsCard(boardOrder({ status: 'ready', items: [boardItem()] }), input).items[0]
        ?.canToggle,
    ).toBe(false);
  });
});
