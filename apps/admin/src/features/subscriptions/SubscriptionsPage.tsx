import { Link } from 'react-router-dom';

import type { AdminSubscriptionItem, AdminSubscriptionStatus } from '@app/shared';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type BadgeProps,
  type DataTableColumn,
} from '@app/ui';

import { ALL, TRIAL_ENDING, useSubscriptionsPage } from './use-subscriptions-page.js';

const STATUSES: AdminSubscriptionStatus[] = ['trialing', 'active', 'past_due', 'canceled'];

const VARIANT: Record<AdminSubscriptionStatus, NonNullable<BadgeProps['variant']>> = {
  trialing: 'info',
  active: 'success',
  past_due: 'warning',
  canceled: 'completed',
};

export default function SubscriptionsPage() {
  const vm = useSubscriptionsPage();
  const { t } = vm;
  const dash = <span className="text-muted-foreground">—</span>;

  const columns: DataTableColumn<AdminSubscriptionItem>[] = [
    {
      id: 'org',
      header: t('subscriptions.columns.restaurant'),
      hideable: false,
      cell: (row) => (
        <Link to={`/restaurants/${row.orgId}`} className="font-medium hover:underline">
          {row.orgName}
        </Link>
      ),
    },
    { id: 'plan', header: t('subscriptions.columns.plan'), cell: (row) => row.planName },
    {
      id: 'status',
      header: t('subscriptions.columns.status'),
      cell: (row) => (
        <Badge variant={VARIANT[row.status]} data-status={row.status}>
          <span className="size-1.5 rounded-full bg-current" aria-hidden />
          {t(`subscriptions.status.${row.status}`)}
        </Badge>
      ),
    },
    {
      id: 'trialEnds',
      header: t('subscriptions.columns.trialEnds'),
      cell: (row) => vm.formatDate(row.trialEndsAt) ?? dash,
    },
    {
      id: 'periodEnd',
      header: t('subscriptions.columns.periodEnd'),
      cell: (row) => vm.formatDate(row.currentPeriodEnd) ?? dash,
    },
    {
      id: 'provider',
      header: t('subscriptions.columns.providerId'),
      cell: (row) =>
        row.providerSubscriptionId ? (
          <span dir="ltr" className="font-mono text-xs">
            {row.providerSubscriptionId}
          </span>
        ) : (
          dash
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader title={t('subscriptions.title')} description={t('subscriptions.description')} />
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-56">
          <Select value={vm.statusValue} onValueChange={vm.onStatusChange}>
            <SelectTrigger aria-label={t('subscriptions.columns.status')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('subscriptions.allStatuses')}</SelectItem>
              <SelectItem value={TRIAL_ENDING}>{t('subscriptions.trialEnding')}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`subscriptions.status.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={vm.planValue} onValueChange={vm.onPlanChange}>
            <SelectTrigger aria-label={t('subscriptions.columns.plan')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('subscriptions.allPlans')}</SelectItem>
              {vm.planOptions.map((p) => (
                <SelectItem key={p.key} value={p.key}>
                  {p.name}
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
              <p>{t('subscriptions.loadError')}</p>
              <Button variant="outline" onClick={vm.retry}>
                {t('common.retry')}
              </Button>
            </div>
          ) : undefined
        }
        emptyState={
          <EmptyState
            title={
              vm.isFiltered ? t('subscriptions.emptyFilteredTitle') : t('subscriptions.emptyTitle')
            }
            description={
              vm.isFiltered ? t('subscriptions.emptyFilteredBody') : t('subscriptions.emptyBody')
            }
          />
        }
        labels={{ actions: t('common.actions'), sortBy: t('common.sortBy') }}
      />
    </div>
  );
}
