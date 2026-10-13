export const PIN_PAD_MAX_LENGTH = 6;
export const PIN_PAD_MIN_SUBMIT_LENGTH = 4;

export function appendPinDigit(current: string, digit: string): string {
  if (current.length >= PIN_PAD_MAX_LENGTH) {
    return current;
  }
  if (!/^\d$/.test(digit)) {
    return current;
  }
  return `${current}${digit}`;
}

export function backspacePin(current: string): string {
  if (current.length === 0) {
    return current;
  }
  return current.slice(0, -1);
}

export function pinPadCanSubmit(current: string): boolean {
  return (
    current.length >= PIN_PAD_MIN_SUBMIT_LENGTH && current.length <= PIN_PAD_MAX_LENGTH
  );
}
