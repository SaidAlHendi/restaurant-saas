import type { PublicMenuPayload } from '@app/shared';

export type MenuPageViewProps = {
  locale: 'ar' | 'en';
  menu: PublicMenuPayload;
  orgSlug: string;
  branchSlug?: string;
  tableLabel: string | null;
  showBranchPicker: boolean;
  canonicalUrl: string;
};

export type MenuProductView = PublicMenuPayload['categories'][number]['products'][number];
