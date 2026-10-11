import { useEffect, useState } from 'react';

import { qrCodeToDataUrl } from '../../lib/qr-code-data-url.js';

export function useQrCardDemo() {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void qrCodeToDataUrl('https://menu.example/en/m/demo').then((url) => {
      if (!cancelled) {
        setDataUrl(url);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { dataUrl };
}
