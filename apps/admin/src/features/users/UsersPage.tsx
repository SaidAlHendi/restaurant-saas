import { Link } from 'react-router-dom';

import type { AdminTenantUser } from '@app/shared';
import {
  Button,
  Combobox,
  DataTable,
  EmptyState,
  PageHeader,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type DataTableColumn,
} from '@app/ui';

import { AdminPagination } from '../../lib/AdminPagination.js';
import { ALL, useUsersPage } from './use-users-page.js';

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
      id: 'branch',
      header: t('users.branch'),
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          {row.memberships.map((m) => (
            <span key={m.orgId}>
              {m.branchNames === null
                ? t('users.allBranches')
                : m.branchNames.join(t('users.listSeparator')) || t('users.none')}
            </span>
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
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          className="max-w-sm"
          defaultValue={vm.search}
          onValueChange={vm.onSearch}
          placeholder={t('users.searchPlaceholder')}
          aria-label={t('users.searchPlaceholder')}
          clearLabel={t('common.clearSearch')}
        />
        <div className="w-44">
          <Select value={vm.role} onValueChange={vm.onRoleChange}>
            <SelectTrigger aria-label={t('users.columns.role')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('users.allRoles')}</SelectItem>
              {vm.roleKeys.map((role) => (
                <SelectItem key={role} value={role}>
                  {t(`users.roles.${role}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <Combobox
            options={vm.restaurantOptions}
            value={vm.orgId}
            onValueChange={vm.onRestaurantChange}
            placeholder={t('users.allRestaurants')}
            searchPlaceholder={t('users.restaurantSearch')}
            emptyText={t('users.restaurantNone')}
          />
        </div>
        {vm.showBranches ? (
          <div className="w-48">
            <Select value={vm.branchId} onValueChange={vm.onBranchChange}>
              <SelectTrigger aria-label={t('users.branch')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('users.allBranches')}</SelectItem>
                {vm.branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
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
            title={vm.filtered ? t('users.emptyFilteredTitle') : t('users.emptyTitle')}
            description={vm.filtered ? t('users.emptyFilteredBody') : t('users.emptyBody')}
          />
        }
        labels={{ actions: t('common.actions'), sortBy: t('common.sortBy') }}
      />
      <AdminPagination
        page={vm.page}
        pageSize={vm.pageSize}
        total={vm.total}
        onPageChange={vm.onPageChange}
      />
    </div>
  );
}
