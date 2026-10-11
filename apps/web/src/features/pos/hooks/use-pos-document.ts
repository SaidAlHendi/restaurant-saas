import { useEffect } from 'react';

export function usePosDocument(): void {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/pos.webmanifest';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);
}
