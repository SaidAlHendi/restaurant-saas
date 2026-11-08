import {
  ActivityIcon,
  ClockIcon,
  CreditCardIcon,
  ReceiptTextIcon,
  StoreIcon,
  TrendingDownIcon,
  WalletIcon,
} from 'lucide-react';

import { Button, EmptyState, OpsRow, Panel, PanelHeader, RankedRow, StatCard } from '@app/ui';

import { useOverviewPage } from './use-overview-page.js';

export default function OverviewPage() {
  const vm = useOverviewPage();
  const { t, data, format } = vm;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{vm.title}</h1>
        {vm.welcome ? <p className="text-sm text-muted-foreground">{vm.welcome}</p> : null}
      </div>

      {vm.isError ? (
        <Panel className="items-center text-center">
          <p>{t('overview.loadError')}</p>
          <Button variant="outline" onClick={vm.retry}>
            {t('common.retry')}
          </Button>
        </Panel>
      ) : vm.isLoading || !data ? (
        <p className="text-sm text-muted-foreground" role="status">
          {t('common.loading')}
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" data-testid="overview-kpis">
            <StatCard emphasis icon={<WalletIcon />} label={t('overview.kpi.mrr')} value={vm.mrr} />
            <StatCard
              icon={<StoreIcon />}
              label={t('overview.kpi.restaurants')}
              value={format.number(data.orgsTotal)}
              delta={t('overview.kpi.restaurantsActive', {
                count: data.orgsByStatus.active,
                formatted: format.number(data.orgsByStatus.active),
              })}
            />
            <StatCard
              icon={<CreditCardIcon />}
              label={t('overview.kpi.subscriptions')}
              value={format.number(data.activeSubscriptions)}
            />
            <StatCard
              icon={<ClockIcon />}
              label={t('overview.kpi.trials')}
              value={format.number(data.trials)}
            />
            <StatCard
              icon={<TrendingDownIcon />}
              label={t('overview.kpi.churn')}
              value={data.churnRate30d === null ? '—' : format.percent(data.churnRate30d)}
              delta={t('overview.kpi.churnCount', {
                formatted: format.number(data.churned30d),
              })}
              deltaHint={t('overview.kpi.last30d')}
              trend={data.churned30d > 0 ? 'up' : 'flat'}
              invertTrendColor
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <PanelHeader
                title={t('overview.planMix.title')}
                description={t('overview.planMix.description')}
              />
              {data.planMix.length === 0 ? (
                <EmptyState title={t('overview.planMix.empty')} />
              ) : (
                <div>
                  {data.planMix.map((row, index) => (
                    <RankedRow
                      key={row.planKey}
                      rank={index + 1}
                      title={row.planName}
                      subtitle={t('overview.planMix.subscriptions', {
                        formatted: format.number(row.subscriptions),
                      })}
                      count={format.number(row.subscriptions)}
                      amount={format.money(row.mrrMinor, row.currency)}
                    />
                  ))}
                </div>
              )}
            </Panel>

            <Panel>
              <PanelHeader
                title={t('overview.activity.title')}
                description={t('overview.activity.description')}
              />
              <div>
                <OpsRow
                  icon={<ReceiptTextIcon />}
                  title={t('overview.activity.orders')}
                  hint={t('overview.activity.ordersHint')}
                  value={format.number(data.orders24h)}
                />
                <OpsRow
                  icon={<ActivityIcon />}
                  title={t('overview.activity.activeOrgs')}
                  hint={t('overview.activity.activeOrgsHint')}
                  value={format.number(data.activeOrgs24h)}
                />
                <OpsRow
                  icon={<StoreIcon />}
                  title={t('overview.activity.suspended')}
                  hint={t('overview.activity.suspendedHint')}
                  value={format.number(data.orgsByStatus.suspended)}
                />
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
