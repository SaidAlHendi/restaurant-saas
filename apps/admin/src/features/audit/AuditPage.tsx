import { Link } from 'react-router-dom';

import type { AdminAuditItem } from '@app/shared';
import {
  Button,
  DataTable,
  EmptyState,
  PageHeader,
  SearchInput,
  type DataTableColumn,
} from '@app/ui';

import { CursorPager } from '../../lib/CursorPager.js';
import { useAuditPage } from './use-audit-page.js';

export default function AuditPage() {
  const vm = useAuditPage();
  const { t } = vm;

  const columns: DataTableColumn<AdminAuditItem>[] = [
    {
      id: 'when',
      header: t('audit.columns.when'),
      hideable: false,
      cell: (row) => <span className="whitespace-nowrap">{vm.formatDate(row.createdAt)}</span>,
    },
    {
      id: 'actor',
      header: t('audit.columns.actor'),
      cell: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate">{row.actorName}</span>
          <span className="truncate text-xs text-muted-foreground" dir="ltr">
            {row.actorEmail}
          </span>
        </div>
      ),
    },
    {
      id: 'role',
      header: t('audit.columns.role'),
      cell: (row) => t(`audit.roles.${row.actorRole}`),
    },
    {
      id: 'action',
      header: t('audit.columns.action'),
      cell: (row) => (
        <span dir="ltr" className="font-mono text-xs">
          {row.action}
        </span>
      ),
    },
    {
      id: 'target',
      header: t('audit.columns.target'),
      cell: (row) =>
        row.orgId && row.targetType === 'organization' ? (
          <Link to={`/restaurants/${row.orgId}`} className="hover:underline">
            {t('audit.viewRestaurant')}
          </Link>
        ) : row.targetType ? (
          <span dir="ltr" className="text-xs">
            {row.targetType}
            {row.targetId ? `:${row.targetId.slice(0, 8)}` : ''}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'ip',
      header: t('audit.columns.ip'),
      cell: (row) =>
        row.ip ? <span dir="ltr">{row.ip}</span> : <span className="text-muted-foreground">—</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader title={t('audit.title')} description={t('audit.description')} />
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          className="w-64"
          defaultValue={vm.actor}
          onValueChange={vm.onActor}
          placeholder={t('audit.actorPlaceholder')}
          aria-label={t('audit.actorPlaceholder')}
          clearLabel={t('common.clearSearch')}
        />
        <SearchInput
          className="w-64"
          defaultValue={vm.action}
          onValueChange={vm.onAction}
          placeholder={t('audit.actionPlaceholder')}
          aria-label={t('audit.actionPlaceholder')}
          clearLabel={t('common.clearSearch')}
        />
      </div>
      <DataTable
        columns={columns}
        data={vm.items}
        getRowId={(row) => row.id}
        isLoading={vm.isLoading}
        error={
          vm.isError ? (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <p>{t('audit.loadError')}</p>
              <Button variant="outline" onClick={vm.retry}>
                {t('common.retry')}
              </Button>
            </div>
          ) : undefined
        }
        emptyState={
          <EmptyState
            title={vm.isFiltered ? t('audit.emptyFilteredTitle') : t('audit.emptyTitle')}
            description={vm.isFiltered ? t('audit.emptyFilteredBody') : t('audit.emptyBody')}
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
