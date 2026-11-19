import type { TFunction } from 'i18next';

import type { OrderDetailsBodyLabels } from './OrderDetailsBodyView.js';

/** All translated strings the shared order-details views need, so both surfaces read the same. */
export function orderDetailsBodyLabels(t: TFunction): OrderDetailsBodyLabels {
  return {
    items: t('orderDetails.cards.items'),
    info: t('orderDetails.cards.info'),
    totals: t('orderDetails.cards.totals'),
    payments: t('orderDetails.cards.payments'),
    timeline: t('orderDetails.cards.timeline'),
    timestamps: t('orderDetails.cards.timestamps'),
    noItems: t('orderDetails.empty.items'),
    noPayments: t('orderDetails.empty.payments'),
    noEvents: t('orderDetails.empty.events'),
    eventsError: t('orderDetails.error.events'),
    loadingTimeline: t('orderDetails.loadingTimeline'),
    addedLater: t('orderDetails.addedLater'),
    tendered: t('orderDetails.payment.tendered'),
    change: t('orderDetails.payment.change'),
    by: t('orderDetails.by'),
    approvedBy: t('orderDetails.approvedBy'),
    reason: t('orderDetails.reason'),
    each: t('orderDetails.each'),
    voidItem: t('pos.orderDetail.voidItem'),
  };
}
