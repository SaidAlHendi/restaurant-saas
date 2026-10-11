import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { downloadQrPng } from '../../../lib/download-qr-png.js';
import { QR_PREVIEW_PX } from '../../../lib/qr-code-sizes.js';
import { useAppSelector } from '../../../app/hooks.js';
import { selectCan } from '../../session/session.selectors.js';
import type { QrCodesPageViewProps } from '../components/QrCodesPageView.js';
import { usePublicQrSources } from './use-public-qr-sources.js';
import { useQrCodeImages } from './use-qr-code-images.js';

export function useQrCodesScreen(): QrCodesPageViewProps {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canManage = useAppSelector(selectCan('branches.manage'));
  const { branchMissing, menuCard, tableCards, tableQrAvailable, isLoading } = usePublicQrSources();

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

  const { images, loading: qrLoading } = useQrCodeImages(urls, QR_PREVIEW_PX);

  const cards = useMemo(() => {
    const result: QrCodesPageViewProps['cards'] = [];
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
        downloadFileName: `table-${table.title.replace(/\s+/g, '-').toLowerCase()}.png`,
      });
    }
    return result;
  }, [images, menuCard, tableCards]);

  return {
    title: t('menu.qr.title'),
    subtitle: t('menu.qr.subtitle'),
    branchMissing,
    branchMissingTitle: t('menu.tables.noBranchTitle'),
    branchMissingDescription: t('menu.tables.noBranchDescription'),
    isLoading,
    qrLoading,
    cards,
    tableQrAvailable,
    tableQrUpsell: t('menu.qr.tableQrUpsell'),
    printLabel: t('menu.qr.print'),
    downloadLabel: t('menu.qr.download'),
    loadingQrLabel: t('common.loading'),
    onPrint: () => {
      void navigate('/dashboard/menu/qr-codes/print');
    },
    onDownload: (url: string, fileName: string) => {
      void downloadQrPng(url, fileName);
    },
    showTableQrHint: canManage && !tableQrAvailable,
  };
}
