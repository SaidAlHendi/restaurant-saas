import { describe, expect, it } from 'vitest';

import { shouldShowSentToKitchenToast } from './pos-payment-toast.utils.js';

describe('shouldShowSentToKitchenToast', () => {
  it('is true when draft becomes placed', () => {
    expect(shouldShowSentToKitchenToast('draft', 'placed')).toBe(true);
  });

  it('is false when paying an already placed order', () => {
    expect(shouldShowSentToKitchenToast('placed', 'placed')).toBe(false);
  });

  it('is false when draft stays draft after partial payment', () => {
    expect(shouldShowSentToKitchenToast('draft', 'draft')).toBe(false);
  });

  it('is false when status before payment is unknown', () => {
    expect(shouldShowSentToKitchenToast(null, 'placed')).toBe(false);
  });
});
