import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Skeleton,
} from '@app/ui';

import { OrgStatusBadge } from './OrgStatusBadge.js';
import { useRestaurantDetailPage } from './use-restaurant-detail-page.js';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words font-medium">{children}</dd>
    </div>
  );
}

export default function RestaurantDetailPage() {
  const vm = useRestaurantDetailPage();
  const { t, restaurant } = vm;
  const none = <span className="font-normal text-muted-foreground">{t('restaurants.none')}</span>;
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

  const subscription = restaurant.subscription;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {restaurant.name}
            <OrgStatusBadge status={restaurant.status} />
          </span>
        }
        description={restaurant.slug}
        breadcrumbs={[backLink, restaurant.name]}
        breadcrumbLabel={t('restaurants.breadcrumb')}
        actions={
          // Step 12e wires suspend / reactivate here (audited, super and support roles).
          <Button variant="outline" disabled title={t('restaurants.actionsSoon')}>
            {restaurant.status === 'suspended'
              ? t('restaurants.reactivate')
              : t('restaurants.suspend')}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('restaurants.sections.restaurant')}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label={t('restaurants.fields.country')}>{restaurant.country}</Field>
              <Field label={t('restaurants.fields.currency')}>{restaurant.defaultCurrency}</Field>
              <Field label={t('restaurants.fields.locale')}>{restaurant.defaultLocale}</Field>
              <Field label={t('restaurants.fields.created')}>
                {vm.formatDate(restaurant.createdAt)}
              </Field>
              <Field label={t('restaurants.columns.branches')}>
                {vm.formatNumber(restaurant.branchCount)}
              </Field>
              <Field label={t('restaurants.fields.members')}>
                {vm.formatNumber(restaurant.memberCount)}
              </Field>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('restaurants.sections.owner')}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label={t('restaurants.fields.ownerName')}>
                {restaurant.ownerName ?? none}
              </Field>
              <Field label={t('restaurants.fields.ownerEmail')}>
                {restaurant.ownerEmail ? <span dir="ltr">{restaurant.ownerEmail}</span> : none}
              </Field>
            </dl>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('restaurants.sections.plan')}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={t('restaurants.columns.plan')}>{restaurant.planName ?? none}</Field>
              <Field label={t('restaurants.fields.subscription')}>
                {subscription ? <Badge variant="outline">{subscription.status}</Badge> : none}
              </Field>
              <Field label={t('restaurants.fields.trialEnds')}>
                {vm.formatDate(subscription?.trialEndsAt ?? null)}
              </Field>
              <Field label={t('restaurants.fields.periodEnd')}>
                {vm.formatDate(subscription?.currentPeriodEnd ?? null)}
              </Field>
            </dl>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('restaurants.sections.branches')}</CardTitle>
            <CardDescription>
              {t('restaurants.branchesCount', { count: restaurant.branches.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {restaurant.branches.map((branch) => (
                <li key={branch.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{branch.name}</span>
                    <span className="truncate text-xs text-muted-foreground" dir="ltr">
                      {branch.slug}
                    </span>
                  </div>
                  <Badge variant={branch.isActive ? 'success' : 'completed'}>
                    {branch.isActive
                      ? t('restaurants.branchActive')
                      : t('restaurants.branchInactive')}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
