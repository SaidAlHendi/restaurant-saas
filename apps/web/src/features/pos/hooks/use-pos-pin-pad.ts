import { useCallback, useState } from 'react';

import {
  appendPinDigit,
  backspacePin,
  pinPadCanSubmit,
} from '../pos-pin-pad.utils.js';

export function usePosPinPad() {
  const [digits, setDigits] = useState('');

  const appendDigit = useCallback((digit: string) => {
    setDigits((prev) => appendPinDigit(prev, digit));
  }, []);

  const backspace = useCallback(() => {
    setDigits((prev) => backspacePin(prev));
  }, []);

  const clear = useCallback(() => {
    setDigits('');
  }, []);

  const canSubmit = pinPadCanSubmit(digits);

  return {
    digits,
    appendDigit,
    backspace,
    clear,
    canSubmit,
  };
}

export type PosPinPadViewModel = ReturnType<typeof usePosPinPad>;
