import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import type { QrPrintLayoutViewProps } from '../components/QrPrintLayoutView.js';
import { usePublicQrSources } from './use-public-qr-sources.js';
import { useQrCodeImages } from './use-qr-code-images.js';

export function useQrPrintScreen(): QrPrintLayoutViewProps {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { branchMissing, menuCard, tableCards } = usePublicQrSources();

  const urls = useMemo(() => {
    const list: string[] = [];
    if (menuCard) {
      list.push(menuCard.url);
    }
    for (const card of tableCards) {
      list.push(card.url);
    }
    return list;
  }, [menuCard, tableCards]);

  const { images, loading: qrLoading } = useQrCodeImages(urls);

  const cards = useMemo(() => {
    const result: QrPrintLayoutViewProps['cards'] = [];
    if (menuCard) {
      result.push({
        ...menuCard,
        qrDataUrl: images[menuCard.url] ?? null,
        downloadFileName: 'menu-qr.png',
      });
    }
    for (const table of tableCards) {
      result.push({
        ...table,
        qrDataUrl: images[table.url] ?? null,
        downloadFileName: `table-${table.title}.png`,
      });
    }
    return result;
  }, [images, menuCard, tableCards]);

  useEffect(() => {
    if (branchMissing) {
      void navigate('/dashboard/menu/qr-codes', { replace: true });
    }
  }, [branchMissing, navigate]);

  return {
    heading: t('menu.qr.printTitle'),
    branchLine: menuCard?.subtitle,
    cards,
    qrLoading,
    loadingQrLabel: t('common.loading'),
    onBackLabel: t('menu.qr.back'),
    onBack: () => {
      void navigate('/dashboard/menu/qr-codes');
    },
    printLabel: t('menu.qr.print'),
    onPrint: () => {
      window.print();
    },
  };
}
