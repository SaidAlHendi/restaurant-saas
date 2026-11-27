import { skipToken } from '@reduxjs/toolkit/query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  adminUserListQuerySchema,
  DEFAULT_PAGE_SIZE,
  intlLocaleForUi,
  SYSTEM_ROLE_KEYS,
} from '@app/shared';

import {
  useGetRestaurantQuery,
  useListRestaurantOptionsQuery,
} from '../restaurants/restaurants.api.js';
import { useListUsersQuery } from './users.api.js';

export const ALL = 'all';

const { shape } = adminUserListQuerySchema;

/** View model for the cross-tenant users list. Filters and page live in the URL. */
export function useUsersPage() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();

  const search = params.get('search') ?? '';
  const role = shape.role.safeParse(params.get('role') ?? undefined).data;
  const orgId = shape.orgId.safeParse(params.get('orgId') ?? undefined).data;
  const branchId = orgId
    ? shape.branchId.safeParse(params.get('branchId') ?? undefined).data
    : undefined;
  const page = shape.page.safeParse(params.get('page') ?? undefined).data ?? 1;

  const { data, isFetching, isError, refetch } = useListUsersQuery({
    search,
    role,
    orgId,
    branchId,
    page,
  });
  const restaurants = useListRestaurantOptionsQuery(undefined);
  const restaurant = useGetRestaurantQuery(orgId ?? skipToken);
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(intlLocaleForUi(i18n.language), { dateStyle: 'medium' }),
    [i18n.language],
  );

  /** Empty or `all` removes a filter. Any change other than paging goes back to page 1. */
  const update = (next: Record<string, string>) => {
    setParams(
      (prev) => {
        const merged = new URLSearchParams(prev);
        merged.delete('page');
        for (const [key, value] of Object.entries(next)) {
          if (value && value !== ALL) merged.set(key, value);
          else merged.delete(key);
        }
        return merged;
      },
      { replace: true },
    );
  };

  return {
    t,
    search,
    role: role ?? ALL,
    roleKeys: SYSTEM_ROLE_KEYS,
    orgId: orgId ?? ALL,
    restaurantOptions: [
      { value: ALL, label: t('users.allRestaurants') },
      ...(restaurants.data ?? []).map((r) => ({ value: r.id, label: r.name, keywords: [r.slug] })),
    ],
    branchId: branchId ?? ALL,
    showBranches: orgId !== undefined,
    branches: restaurant.currentData?.branches ?? [],
    filtered: Boolean(search || role || orgId),
    items: data?.items ?? [],
    isLoading: isFetching && !data,
    isFetching,
    isError,
    retry: () => void refetch(),
    page,
    pageSize: data?.pageSize ?? DEFAULT_PAGE_SIZE,
    total: data?.total ?? 0,
    onPageChange: (value: number) => {
      update({ page: value > 1 ? String(value) : '' });
    },
    onSearch: (value: string) => {
      update({ search: value });
    },
    onRoleChange: (value: string) => {
      update({ role: value });
    },
    /** A branch belongs to one restaurant, so changing restaurant drops it. */
    onRestaurantChange: (value: string | null) => {
      update({ orgId: value ?? ALL, branchId: '' });
    },
    onBranchChange: (value: string) => {
      update({ branchId: value });
    },
    formatDate: (iso: string | null) => (iso ? dateFormat.format(new Date(iso)) : null),
  };
}
