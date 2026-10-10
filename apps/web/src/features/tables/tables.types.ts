import type { DiningTable } from '@app/shared';

export type DiningTableListItem = DiningTable & {
  qrToken?: string;
};
