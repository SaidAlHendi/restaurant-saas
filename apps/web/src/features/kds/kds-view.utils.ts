import { pickLocalizedText, type KitchenBoardOrder } from '@app/shared';

import {
  ageLevelFor,
  canToggleItems,
  formatAge,
  nextKitchenStatus,
  orderAgeMs,
  type AgeLevel,
} from './kds-board.utils.js';
import type { KdsSettings } from './kds-settings.utils.js';

export type KdsCardLabels = {
  orderNumber: (n: number) => string;
  type: (type: KitchenBoardOrder['type']) => string;
  table: (label: string) => string;
  added: string;
  voided: string;
  start: string;
  ready: string;
  awaitingPayment: string;
  readyForPickup: string;
  age: (age: string) => string;
};

export type KdsCardItemModel = {
  id: string;
  quantity: number;
  name: string;
  modifiers: string[];
  note: string | null;
  isReady: boolean;
  isAddition: boolean;
  isVoided: boolean;
  voidReason: string | null;
  canToggle: boolean;
};

export type KdsCardModel = {
  id: string;
  version: number;
  status: KitchenBoardOrder['status'];
  orderNumberLabel: string;
  typeLabel: string;
  subtitle: string | null;
  ageLabel: string;
  ageLevel: AgeLevel;
  ageAriaLabel: string;
  note: string | null;
  items: KdsCardItemModel[];
  addedLabel: string;
  voidedLabel: string;
  next: 'preparing' | 'ready' | null;
  actionLabel: string | null;
  statusNote: string | null;
};

export type BuildCardInput = {
  nowMs: number;
  offsetMs: number;
  settings: Pick<KdsSettings, 'amberMinutes' | 'redMinutes'>;
  locale: string;
  defaultLocale: string;
  labels: KdsCardLabels;
};

/** Pure: board order -> what the card shows. Additions sort after the original items. */
export function buildKdsCard(order: KitchenBoardOrder, input: BuildCardInput): KdsCardModel {
  const { labels } = input;
  const ageMs = orderAgeMs(order.placedAt, input.nowMs, input.offsetMs);
  const age = formatAge(ageMs);
  const next = nextKitchenStatus(order.status);
  const toggleable = canToggleItems(order.status);
  const items = [...order.items].sort((a, b) => Number(a.isAddition) - Number(b.isAddition));

  let subtitle: string | null = null;
  if (order.tableLabel) {
    subtitle = labels.table(order.tableLabel);
  } else if (order.customerName) {
    subtitle = order.customerName;
  }

  return {
    id: order.id,
    version: order.version,
    status: order.status,
    orderNumberLabel: labels.orderNumber(order.orderNumber),
    typeLabel: labels.type(order.type),
    subtitle,
    ageLabel: age,
    ageLevel: ageLevelFor(ageMs, input.settings),
    ageAriaLabel: labels.age(age),
    note: order.notes,
    addedLabel: labels.added,
    voidedLabel: labels.voided,
    items: items.map((item) => {
      const isVoided = item.status === 'voided' || item.voidedAt !== null;
      return {
        id: item.id,
        quantity: item.quantity,
        name: pickLocalizedText(item.name, input.locale, input.defaultLocale),
        modifiers: item.modifiers.map((m) =>
          pickLocalizedText(m.name, input.locale, input.defaultLocale),
        ),
        note: item.notes,
        isReady: item.status === 'ready',
        isAddition: item.isAddition,
        isVoided,
        voidReason: item.voidReason,
        canToggle: toggleable && !isVoided,
      };
    }),
    next,
    actionLabel: next === 'preparing' ? labels.start : next === 'ready' ? labels.ready : null,
    statusNote:
      order.status === 'ready'
        ? order.paymentStatus === 'paid'
          ? labels.readyForPickup
          : labels.awaitingPayment
        : null,
  };
}
