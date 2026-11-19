import { Link } from 'react-router-dom';

import type { AdminTenantUser } from '@app/shared';
import {
  Button,
  DataTable,
  EmptyState,
  PageHeader,
  SearchInput,
  type DataTableColumn,
} from '@app/ui';

import { CursorPager } from '../../lib/CursorPager.js';
import { useUsersPage } from './use-users-page.js';

export default function UsersPage() {
  const vm = useUsersPage();
  const { t } = vm;

  const columns: DataTableColumn<AdminTenantUser>[] = [
    {
      id: 'name',
      header: t('users.columns.name'),
      hideable: false,
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      id: 'email',
      header: t('users.columns.email'),
      cell: (row) =>
        row.email ? (
          <span dir="ltr">{row.email}</span>
        ) : (
          <span className="text-muted-foreground">{t('users.none')}</span>
        ),
    },
    {
      id: 'orgs',
      header: t('users.columns.restaurants'),
      cell: (row) =>
        row.memberships.length === 0 ? (
          <span className="text-muted-foreground">{t('users.none')}</span>
        ) : (
          <div className="flex flex-col gap-0.5">
            {row.memberships.map((m) => (
              <Link
                key={m.orgId}
                to={`/restaurants/${m.orgId}`}
                className="truncate hover:underline"
              >
                {m.orgName}
              </Link>
            ))}
          </div>
        ),
    },
    {
      id: 'role',
      header: t('users.columns.role'),
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          {row.memberships.map((m) => (
            <span key={m.orgId}>{m.roleName}</span>
          ))}
        </div>
      ),
    },
    {
      id: 'lastLogin',
      header: t('users.columns.lastLogin'),
      cell: (row) =>
        vm.formatDate(row.lastLoginAt) ?? (
          <span className="text-muted-foreground">{t('users.never')}</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader title={t('users.title')} description={t('users.description')} />
      <SearchInput
        className="max-w-sm"
        defaultValue={vm.search}
        onValueChange={vm.onSearch}
        placeholder={t('users.searchPlaceholder')}
        aria-label={t('users.searchPlaceholder')}
        clearLabel={t('common.clearSearch')}
      />
      <DataTable
        columns={columns}
        data={vm.items}
        getRowId={(row) => row.id}
        isLoading={vm.isLoading}
        error={
          vm.isError ? (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <p>{t('users.loadError')}</p>
              <Button variant="outline" onClick={vm.retry}>
                {t('common.retry')}
              </Button>
            </div>
          ) : undefined
        }
        emptyState={
          <EmptyState
            title={vm.search ? t('users.emptyFilteredTitle') : t('users.emptyTitle')}
            description={vm.search ? t('users.emptyFilteredBody') : t('users.emptyBody')}
          />
        }
        labels={{ actions: t('common.actions'), sortBy: t('common.sortBy') }}
      />
      <CursorPager
        pageLabel={t('common.page', { page: vm.pageNumber })}
        previousLabel={t('common.previous')}
        nextLabel={t('common.next')}
        hasPrevious={vm.hasPrevious}
        hasNext={vm.hasNext}
        disabled={vm.isFetching}
        onPrevious={vm.onPrevious}
        onNext={vm.onNext}
      />
    </div>
  );
}
