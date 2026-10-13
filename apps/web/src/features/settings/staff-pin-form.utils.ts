export type ValidatePinFormResult =
  | { ok: true; pin: string }
  | { ok: false; reason: 'too_short' | 'too_long' | 'not_digits' | 'mismatch' };

export function validatePinForm(pin: string, confirm: string): ValidatePinFormResult {
  const trimmed = pin.trim();
  const confirmTrimmed = confirm.trim();
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, reason: 'not_digits' };
  }
  if (trimmed.length < 4) {
    return { ok: false, reason: 'too_short' };
  }
  if (trimmed.length > 6) {
    return { ok: false, reason: 'too_long' };
  }
  if (trimmed !== confirmTrimmed) {
    return { ok: false, reason: 'mismatch' };
  }
  return { ok: true, pin: trimmed };
}
