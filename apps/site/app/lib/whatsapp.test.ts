import { describe, expect, it } from 'vitest';

import { WHATSAPP_PLACEHOLDER_NUMBER } from './brand.js';
import { isPlaceholderWhatsapp, parseWhatsappNumber, whatsappHref } from './whatsapp.js';

describe('parseWhatsappNumber', () => {
  it('keeps only the digits of a formatted number', () => {
    expect(parseWhatsappNumber('+966 50 123 4567')).toBe('966501234567');
    expect(parseWhatsappNumber('00966501234567')).toBe('966501234567');
  });

  it('falls back to the placeholder when missing or not a plausible number', () => {
    for (const bad of [undefined, null, '', 'call us', '123', '1'.repeat(16)]) {
      expect(parseWhatsappNumber(bad)).toBe(WHATSAPP_PLACEHOLDER_NUMBER);
    }
  });

  it('recognises the placeholder', () => {
    expect(isPlaceholderWhatsapp(WHATSAPP_PLACEHOLDER_NUMBER)).toBe(true);
    expect(isPlaceholderWhatsapp('966501234567')).toBe(false);
  });
});

describe('whatsappHref', () => {
  it('builds a click-to-chat link with an encoded first message', () => {
    expect(whatsappHref('966501234567', 'Hello, Sahtain')).toBe(
      'https://wa.me/966501234567?text=Hello%2C%20Sahtain',
    );
  });
});
