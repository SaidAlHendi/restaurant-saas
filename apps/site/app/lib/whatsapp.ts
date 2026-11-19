import { WHATSAPP_PLACEHOLDER_NUMBER } from './brand.js';

/**
 * Accept a number written any way ("+966 50 123 4567", "00966501234567") and keep the digits wa.me
 * expects: country code first, no plus, 8 to 15 digits. Anything else falls back to the placeholder.
 */
export function parseWhatsappNumber(raw: string | undefined | null): string {
  const digits = (raw ?? '').replace(/[^0-9]/g, '').replace(/^00/, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : WHATSAPP_PLACEHOLDER_NUMBER;
}

export function isPlaceholderWhatsapp(number: string): boolean {
  return number === WHATSAPP_PLACEHOLDER_NUMBER;
}

/** Click-to-chat link with a ready-to-send first message. */
export function whatsappHref(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
