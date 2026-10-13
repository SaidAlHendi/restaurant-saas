import { useEffect } from 'react';

export function usePosPinPadKeyboard(input: {
  enabled: boolean;
  canSubmit: boolean;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
}): void {
  const { enabled, canSubmit, onDigit, onBackspace, onSubmit } = input;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.length === 1 && event.key >= '0' && event.key <= '9') {
        event.preventDefault();
        onDigit(event.key);
        return;
      }
      if (event.key === 'Backspace') {
        event.preventDefault();
        onBackspace();
        return;
      }
      if (event.key === 'Enter' && canSubmit) {
        event.preventDefault();
        onSubmit();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [canSubmit, enabled, onBackspace, onDigit, onSubmit]);
}
