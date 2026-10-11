/** Vitest stub — production uses the real `qrcode` package after `pnpm install`. */
export const mockToDataUrlCalls: Array<{ text: string; width?: number }> = [];

export function toDataURL(
  text: string,
  options?: {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    width?: number;
  },
): Promise<string> {
  mockToDataUrlCalls.push({ text, width: options?.width });
  return Promise.resolve('data:image/png;base64,test');
}

export function resetMockToDataUrlCalls(): void {
  mockToDataUrlCalls.length = 0;
}
