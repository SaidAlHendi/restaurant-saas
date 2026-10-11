import { describe, expect, it } from 'vitest';

import { renderKitchenItemLinesHtml } from './print-label.utils.js';

describe('print HTML escaping', () => {
  it('escapes XSS in item notes and does not emit raw img tags', () => {
    const html = renderKitchenItemLinesHtml(
      [
        {
          id: '01932a1a-7b3e-7000-8000-000000000050',
          productId: '01932a1a-7b3e-7000-8000-000000000040',
          productNameSnapshot: { en: 'Tea' },
          unitPriceMinor: 100,
          quantity: 1,
          lineTotalMinor: 100,
          notes: '<img src=x onerror=alert(1)>',
          status: 'pending',
          isAddition: false,
          voidedAt: null,
          voidReason: null,
          modifiers: [],
        },
      ],
      'en',
      'en',
    );
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html.includes('<img')).toBe(false);
  });
});
