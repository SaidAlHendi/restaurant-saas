import { Link } from 'react-router-dom';

import type { AdminOrgListItem } from '@app/shared';

import {
  Button,
  DataTable,
  EmptyState,
  NumberedPagination,
  PageHeader,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type DataTableColumn,
} from '@app/ui';

import { OrgStatusBadge } from './OrgStatusBadge.js';
import { ALL_STATUSES, useRestaurantsPage } from './use-restaurants-page.js';

const STATUS_OPTIONS = ['trial', 'active', 'past_due', 'suspended', 'cancelled'] as const;

export default function RestaurantsPage() {
  const vm = useRestaurantsPage();
  const { t } = vm;

  const columns: DataTableColumn<AdminOrgListItem>[] = [
    {
      id: 'name',
      header: t('restaurants.columns.name'),
      hideable: false,
      cell: (row) => (
        <div className="flex min-w-0 flex-col">
          <Link
            to={`/restaurants/${row.id}`}
            className="truncate font-medium hover:underline"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            {row.name}
          </Link>
          <span className="truncate text-xs text-muted-foreground" dir="ltr">
            {row.slug}
          </span>
        </div>
      ),
    },
    {
      id: 'owner',
      header: t('restaurants.columns.owner'),
      cell: (row) =>
        row.ownerEmail ? (
          <div className="flex min-w-0 flex-col">
            <span className="truncate">{row.ownerName}</span>
            <span className="truncate text-xs text-muted-foreground" dir="ltr">
              {row.ownerEmail}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">{t('restaurants.none')}</span>
        ),
    },
    {
      id: 'plan',
      header: t('restaurants.columns.plan'),
      cell: (row) =>
        row.planName ?? <span className="text-muted-foreground">{t('restaurants.none')}</span>,
    },
    {
      id: 'status',
      header: t('restaurants.columns.status'),
      cell: (row) => <OrgStatusBadge status={row.status} />,
    },
    {
      id: 'branches',
      header: t('restaurants.columns.branches'),
      align: 'end',
      cell: (row) => vm.formatNumber(row.branchCount),
    },
    {
      id: 'created',
      header: t('restaurants.columns.created'),
      cell: (row) => vm.formatDate(row.createdAt),
    },
  ];

  const filtered = vm.q !== '' || vm.status !== ALL_STATUSES;

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader
        title={t('restaurants.title')}
        description={t('restaurants.description', { count: vm.total })}
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          className="max-w-sm"
          defaultValue={vm.q}
          onValueChange={vm.onSearch}
          placeholder={t('restaurants.searchPlaceholder')}
          aria-label={t('restaurants.searchPlaceholder')}
          clearLabel={t('restaurants.clearSearch')}
        />
        <div className="w-48">
          <Select value={vm.status} onValueChange={vm.onStatusChange}>
            <SelectTrigger aria-label={t('restaurants.columns.status')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES}>{t('restaurants.allStatuses')}</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`restaurants.status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={vm.items}
        getRowId={(row) => row.id}
        isLoading={vm.isLoading}
        error={
          vm.isError ? (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <p>{t('restaurants.loadError')}</p>
              <Button variant="outline" onClick={vm.retry}>
                {t('common.retry')}
              </Button>
            </div>
          ) : undefined
        }
        emptyState={
          <EmptyState
            title={filtered ? t('restaurants.emptyFilteredTitle') : t('restaurants.emptyTitle')}
            description={filtered ? t('restaurants.emptyFilteredBody') : t('restaurants.emptyBody')}
          />
        }
        onRowClick={vm.openRestaurant}
        labels={{ actions: t('restaurants.columns.actions'), sortBy: t('restaurants.sortBy') }}
      />

      {vm.pageCount > 1 ? (
        <NumberedPagination
          page={vm.page}
          pageCount={vm.pageCount}
          onPageChange={vm.onPageChange}
          formatNumber={vm.formatNumber}
          labels={{
            navigation: t('restaurants.pagination.navigation'),
            previous: t('restaurants.pagination.previous'),
            next: t('restaurants.pagination.next'),
            page: (n) => t('restaurants.pagination.page', { page: n }),
            morePages: t('restaurants.pagination.more'),
          }}
        />
      ) : null}
    </div>
  );
}
