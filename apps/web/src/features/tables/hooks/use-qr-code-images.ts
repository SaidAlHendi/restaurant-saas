import { useEffect, useState } from 'react';

import { qrCodeToDataUrl } from '../../../lib/qr-code-data-url.js';

export function useQrCodeImages(urls: string[]): {
  images: Record<string, string>;
  loading: boolean;
} {
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (urls.length === 0) {
        setImages({});
        setLoading(false);
        return;
      }
      setLoading(true);
      const entries: Array<[string, string]> = [];
      for (const url of urls) {
        const dataUrl = await qrCodeToDataUrl(url);
        entries.push([url, dataUrl]);
      }
      if (!cancelled) {
        setImages(Object.fromEntries(entries));
        setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [urls]);

  return { images, loading };
}
