import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '../../../app/hooks.js';
import { buildPublicMenuUrl, buildPublicTableUrl } from '../../../lib/public-menu-urls.js';
import {
  selectCurrentBranchId,
  selectSessionBranches,
  selectSessionOrg,
} from '../../session/session.selectors.js';
import { useListDiningTablesQuery } from '../tables.api.js';

export type QrSourceCard = {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
};

export function usePublicQrSources(): {
  branchMissing: boolean;
  menuCard: QrSourceCard | null;
  tableCards: QrSourceCard[];
  tableQrAvailable: boolean;
  isLoading: boolean;
} {
  const org = useAppSelector(selectSessionOrg);
  const branchId = useAppSelector(selectCurrentBranchId);
  const branches = useAppSelector(selectSessionBranches);
  const { i18n } = useTranslation();

  const branchMissing = branchId === null;
  const { data, isLoading } = useListDiningTablesQuery(branchId ?? '', {
    skip: branchMissing,
  });

  const branch = useMemo(() => {
    if (branchId === null) {
      return undefined;
    }
    return branches.find((b) => b.id === branchId);
  }, [branchId, branches]);

  const locale = org?.defaultLocale ?? i18n.language;

  const menuCard = useMemo((): QrSourceCard | null => {
    if (!org) {
      return null;
    }
    const url = buildPublicMenuUrl(org.slug, locale, branch?.slug);
    return {
      id: 'menu',
      title: org.name,
      subtitle: branch?.name,
      url,
    };
  }, [branch?.name, branch?.slug, locale, org]);

  const tableCards = useMemo((): QrSourceCard[] => {
    const items = data?.items ?? [];
    return items
      .filter((table) => table.isActive && table.qrToken !== undefined)
      .map((table) => ({
        id: table.id,
        title: table.label,
        subtitle: branch?.name,
        url: buildPublicTableUrl(table.qrToken ?? ''),
      }));
  }, [branch?.name, data?.items]);

  const tableQrAvailable = tableCards.length > 0;

  return {
    branchMissing,
    menuCard,
    tableCards,
    tableQrAvailable,
    isLoading: !branchMissing && isLoading,
  };
}
