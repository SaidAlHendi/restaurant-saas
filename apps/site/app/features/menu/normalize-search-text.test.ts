import { describe, expect, it } from 'vitest';

import { normalizeSearchText } from './normalize-search-text.js';

describe('normalizeSearchText', () => {
  it('lower-cases and trims', () => {
    expect(normalizeSearchText('  Latte ')).toBe('latte');
  });

  it('matches Arabic written without hamza or diacritics', () => {
    expect(normalizeSearchText('أمريكانو')).toBe(normalizeSearchText('امريكانو'));
    expect(normalizeSearchText('قَهْوَة')).toBe(normalizeSearchText('قهوه'));
  });
});
