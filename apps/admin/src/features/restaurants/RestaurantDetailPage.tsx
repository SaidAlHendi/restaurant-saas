import { HistoryIcon, LayoutGridIcon, StoreIcon, UsersIcon, WalletIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from '@app/ui';

import { ActivateDialog } from './ActivateDialog.js';
import { BillingTab } from './BillingTab.js';
import { BranchesTab } from './BranchesTab.js';
import { HistoryTab } from './HistoryTab.js';
import { OrgStatusBadge } from './OrgStatusBadge.js';
import { OverviewTab } from './OverviewTab.js';
import { PLAN_TONE } from './plan-summary.js';
import { PlanBanner } from './PlanBanner.js';
import { SummaryStrip } from './SummaryStrip.js';
import { TeamTab } from './TeamTab.js';
import { useRestaurantDetailPage } from './use-restaurant-detail-page.js';

const TAB =
  'flex-none rounded-none border-0 focus-visible:ring-inset border-b-4 border-transparent px-4 py-3 text-base text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none';

export default function RestaurantDetailPage() {
  const vm = useRestaurantDetailPage();
  const { t, restaurant } = vm;
  const backLink = <Link to="/restaurants">{t('adminNav.restaurants')}</Link>;

  if (vm.isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (vm.notFound) {
    return (
      <div className="p-6">
        <EmptyState
          title={t('restaurants.notFoundTitle')}
          description={t('restaurants.notFoundBody')}
          action={
            <Button asChild variant="outline">
              <Link to="/restaurants">{t('restaurants.backToList')}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (vm.isError || !restaurant) {
    return (
      <div className="flex flex-col items-start gap-3 p-6">
        <Alert variant="destructive">
          <AlertTitle>{t('restaurants.loadErrorTitle')}</AlertTitle>
          <AlertDescription>{t('restaurants.loadError')}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={vm.retry}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span
              aria-hidden
              className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary text-2xl text-primary-foreground"
            >
              {vm.initial}
            </span>
            <span className="min-w-0 break-words">{restaurant.name}</span>
            <OrgStatusBadge status={restaurant.status} />
          </span>
        }
        description={
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <span dir="ltr">{restaurant.slug}</span>
            <span>{vm.countryName(restaurant.country)}</span>
            {restaurant.ownerName ? <span>{restaurant.ownerName}</span> : null}
            {restaurant.ownerEmail ? (
              <a className="hover:underline" dir="ltr" href={`mailto:${restaurant.ownerEmail}`}>
                {restaurant.ownerEmail}
              </a>
            ) : null}
          </span>
        }
        breadcrumbs={[backLink, restaurant.name]}
        breadcrumbLabel={t('restaurants.breadcrumb')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              disabled={!vm.canActivate || vm.isSuspended}
              title={vm.canActivate ? undefined : t('restaurants.billingOnly')}
              onClick={vm.openActivate}
            >
              {t('restaurants.activate')}
            </Button>
            <Button
              variant={vm.isSuspended ? 'default' : 'outline'}
              disabled={!vm.canManageStatus || !vm.canChangeStatus}
              title={vm.canManageStatus ? undefined : t('restaurants.superOnly')}
              onClick={() => {
                vm.setConfirmOpen(true);
              }}
            >
              {vm.isSuspended ? t('restaurants.reactivate') : t('restaurants.suspend')}
            </Button>
          </div>
        }
      />

      <ActivateDialog vm={vm} name={restaurant.name} />

      <ConfirmDialog
        open={vm.confirmOpen}
        onOpenChange={vm.setConfirmOpen}
        variant={vm.isSuspended ? 'default' : 'destructive'}
        title={t(vm.isSuspended ? 'restaurants.reactivateTitle' : 'restaurants.suspendTitle', {
          name: restaurant.name,
        })}
        description={t(vm.isSuspended ? 'restaurants.reactivateBody' : 'restaurants.suspendBody')}
        confirmLabel={vm.isSuspended ? t('restaurants.reactivate') : t('restaurants.suspend')}
        cancelLabel={t('common.cancel')}
        onConfirm={vm.confirmStatusChange}
        isConfirming={vm.isChangingStatus}
      />

      <PlanBanner vm={vm} restaurant={restaurant} />

      <SummaryStrip vm={vm} restaurant={restaurant} />

      <Tabs defaultValue="overview" dir={vm.direction} className="gap-4">
        {/* Stays on screen while a long tab scrolls, with the plan still named beside it. */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-card">
          <TabsList
            aria-label={t('restaurants.tabsLabel')}
            className="h-auto max-w-full justify-start overflow-x-auto overflow-y-hidden rounded-none bg-transparent p-0"
          >
            <TabsTrigger value="overview" className={TAB}>
              <LayoutGridIcon aria-hidden />
              {t('restaurants.tabs.overview')}
            </TabsTrigger>
            <TabsTrigger value="branches" className={TAB}>
              <StoreIcon aria-hidden />
              {t('restaurants.tabs.branches')}
            </TabsTrigger>
            <TabsTrigger value="team" className={TAB}>
              <UsersIcon aria-hidden />
              {t('restaurants.tabs.team')}
            </TabsTrigger>
            <TabsTrigger value="billing" className={TAB}>
              <WalletIcon aria-hidden />
              {t('restaurants.tabs.billing')}
            </TabsTrigger>
            <TabsTrigger value="history" className={TAB}>
              <HistoryIcon aria-hidden />
              {t('restaurants.tabs.history')}
            </TabsTrigger>
          </TabsList>
          {vm.plan ? (
            <span
              className={cn(
                'hidden shrink-0 rounded-full px-3 py-1 text-sm font-semibold md:inline',
                PLAN_TONE[vm.plan.state],
              )}
            >
              {restaurant.planName ?? t('restaurants.banner.state.none')} /{' '}
              {t(`restaurants.banner.state.${vm.plan.state}`)}
            </span>
          ) : null}
        </div>
        <TabsContent value="overview">
          <OverviewTab vm={vm} restaurant={restaurant} />
        </TabsContent>
        <TabsContent value="branches">
          <BranchesTab vm={vm} restaurant={restaurant} />
        </TabsContent>
        <TabsContent value="team">
          <TeamTab vm={vm} restaurant={restaurant} />
        </TabsContent>
        <TabsContent value="billing">
          <BillingTab vm={vm} restaurant={restaurant} />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab vm={vm} restaurant={restaurant} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
