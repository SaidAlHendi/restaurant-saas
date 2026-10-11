import { useEffect, useState } from 'react';

import { qrCodeToDataUrl } from '../../lib/qr-code-data-url.js';
import { QR_PREVIEW_PX } from '../../lib/qr-code-sizes.js';

export function useQrCardDemo() {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void qrCodeToDataUrl('https://menu.example/en/m/demo', QR_PREVIEW_PX).then((url) => {
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
