const MAX_TAX_BP = 10_000;

export type ParseTaxPercentResult =
  | { ok: true; bp: number }
  | { ok: false; reason: 'empty' | 'invalid' | 'negative' | 'too_high' | 'too_many_decimals' };

export function parseTaxPercentInput(raw: string): ParseTaxPercentResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: 'empty' };
  }
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return { ok: false, reason: 'invalid' };
  }
  const parts = trimmed.split('.');
  const fraction = parts[1];
  if (fraction !== undefined && fraction.length > 2) {
    return { ok: false, reason: 'too_many_decimals' };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { ok: false, reason: 'invalid' };
  }
  if (value < 0) {
    return { ok: false, reason: 'negative' };
  }
  if (value > 100) {
    return { ok: false, reason: 'too_high' };
  }
  const bp = Math.round(value * 100);
  if (bp > MAX_TAX_BP) {
    return { ok: false, reason: 'too_high' };
  }
  return { ok: true, bp };
}

export function taxBpToPercentInput(bp: number): string {
  const clamped = Math.min(MAX_TAX_BP, Math.max(0, bp));
  const whole = Math.floor(clamped / 100);
  const frac = clamped % 100;
  if (frac === 0) {
    return String(whole);
  }
  const fracStr = frac.toString().padStart(2, '0').replace(/0+$/, '');
  return `${String(whole)}.${fracStr}`;
}
