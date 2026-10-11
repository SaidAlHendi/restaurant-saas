// Pure helpers for number and money fields. Money is always integer minor units (no floats).

export { currencyDigits, currencySymbol, formatMinor } from '@app/shared';

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN = '۰۱۲۳۴۵۶۷۸۹';

/** Converts Arabic-Indic / Persian digits and separators to ASCII ("١٢٫٥" -> "12.5"). */
export function normalizeDigits(text: string): string {
  let out = '';
  for (const ch of text) {
    const arabic = ARABIC_INDIC.indexOf(ch);
    const persian = PERSIAN.indexOf(ch);
    if (arabic >= 0) out += String(arabic);
    else if (persian >= 0) out += String(persian);
    else if (ch === '٫' || ch === ',') out += '.';
    else if (ch === '٬' || ch === ' ' || ch === ' ' || ch === ' ') continue;
    else if (ch === '−') out += '-';
    else out += ch;
  }
  return out;
}

const MONEY_PATTERN = /^(-)?(\d*)(?:\.(\d*))?$/;

/**
 * Parses what the user typed into minor units.
 * Returns null for an empty field and undefined when the text is not a valid amount
 * (bad characters or more decimals than the currency allows).
 */
export function parseMinor(
  text: string,
  digits: number,
  { allowNegative = false } = {},
): number | null | undefined {
  const normalized = normalizeDigits(text.trim());
  if (normalized === '' || normalized === '-' || normalized === '.') return null;
  const match = MONEY_PATTERN.exec(normalized);
  if (!match) return undefined;
  const [, sign, whole = '', fraction = ''] = match;
  if (sign && !allowNegative) return undefined;
  if (fraction.length > digits) return undefined;
  const minor = Number(`${whole || '0'}${fraction.padEnd(digits, '0')}`);
  if (!Number.isSafeInteger(minor)) return undefined;
  return sign ? -minor : minor;
}

/** Minor units as plain editable text: 1500 (2 digits) -> "15.00". */
export function minorToText(minor: number, digits: number): string {
  const negative = minor < 0;
  const abs = String(Math.abs(minor)).padStart(digits + 1, '0');
  const text = digits === 0 ? abs : `${abs.slice(0, -digits)}.${abs.slice(-digits)}`;
  return negative ? `-${text}` : text;
}

/** Parses an integer or decimal typed in any digits. Undefined when invalid, null when empty. */
export function parseNumber(
  text: string,
  { allowDecimal = false, allowNegative = false } = {},
): number | null | undefined {
  const normalized = normalizeDigits(text.trim());
  if (normalized === '' || normalized === '-') return null;
  const pattern = allowDecimal ? /^-?\d*\.?\d*$/ : /^-?\d+$/;
  if (!pattern.test(normalized) || normalized === '.') return undefined;
  if (normalized.startsWith('-') && !allowNegative) return undefined;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}

export function clamp(value: number, min?: number, max?: number): number {
  let out = value;
  if (min !== undefined) out = Math.max(min, out);
  if (max !== undefined) out = Math.min(max, out);
  return out;
}
