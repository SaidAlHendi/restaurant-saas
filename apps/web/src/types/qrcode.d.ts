declare module 'qrcode' {
  type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

  export function toDataURL(
    text: string,
    options?: {
      errorCorrectionLevel?: QrErrorCorrectionLevel;
      margin?: number;
      width?: number;
    },
  ): Promise<string>;
}
