import type { DataChangedScope } from '@app/shared';

type TagType =
  | 'Me'
  | 'Category'
  | 'Product'
  | 'ModifierGroup'
  | 'DiningTable'
  | 'Bill'
  | 'PosMenu'
  | 'Branch'
  | 'OrgSettings'
  | 'Staff'
  | 'PosDevice'
  | 'Billing';

/** RTK Query tags to refetch for each kind of `data.changed` event. */
export const SCOPE_TAGS: Record<DataChangedScope, readonly TagType[]> = {
  tables: ['DiningTable', 'Bill'],
  settings: ['OrgSettings', 'PosMenu', 'Branch'],
  branch: ['Branch', 'PosMenu'],
  staff: ['Staff'],
  devices: ['PosDevice'],
  plan: ['Billing', 'OrgSettings'],
};

export const CATALOG_TAGS: readonly TagType[] = ['Category', 'Product', 'ModifierGroup', 'PosMenu'];

/** Scopes after which the session (permissions, branches, plan features) must be re-read. */
export const SESSION_SCOPES: readonly DataChangedScope[] = ['settings', 'branch', 'staff', 'plan'];
