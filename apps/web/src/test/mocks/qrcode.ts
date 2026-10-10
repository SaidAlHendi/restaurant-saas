/** Vitest stub — production uses the real `qrcode` package after `pnpm install`. */
export function toDataURL(
  _text: string,
  _options?: {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    width?: number;
  },
): Promise<string> {
  return Promise.resolve('data:image/png;base64,test');
}
