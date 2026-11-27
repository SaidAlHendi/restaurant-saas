import type { ReactNode } from 'react';

import type { AdminOrgDetail } from '@app/shared';
import { cn } from '@app/ui';

import { PLAN_TONE } from './plan-summary.js';
import type { RestaurantDetailVm } from './use-restaurant-detail-page.js';

function Stub({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-sm opacity-85">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

/**
 * The current plan, drawn as a ticket: plan and time left above the tear line, what it allows below.
 * It sits above the tabs, so every tab shows it.
 */
export function PlanBanner({
  vm,
  restaurant,
}: {
  vm: RestaurantDetailVm;
  restaurant: AdminOrgDetail;
}) {
  const { t, plan } = vm;
  if (!plan) return null;
  const { planDetail } = restaurant;
  const unlimited = t('plans.unlimited');
  return (
    <section
      aria-label={t('restaurants.banner.label')}
      data-plan-state={plan.state}
      className={cn('overflow-hidden rounded-2xl shadow-md', PLAN_TONE[plan.state])}
    >
      <div className="flex flex-wrap items-end justify-between gap-6 p-6">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-sm font-medium opacity-85">{t('restaurants.banner.label')}</p>
          <p className="break-words text-4xl font-bold tracking-tight sm:text-5xl">
            {restaurant.planName ?? t('restaurants.banner.state.none')}
          </p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="rounded-full border border-current px-3 py-0.5 text-sm font-semibold">
              {t(`restaurants.banner.state.${plan.state}`)}
            </span>
            {planDetail ? (
              <span className="text-sm">
                {t(`restaurants.values.${planDetail.perBranch ? 'perBranchMonth' : 'perMonth'}`, {
                  price: vm.money(planDetail.priceMinor, planDetail.currency),
                })}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          {plan.daysLeft !== null ? (
            <p className="flex items-baseline gap-2">
              <span className="text-6xl font-bold leading-none tabular-nums">
                {vm.formatNumber(plan.daysLeft)}
              </span>
              <span className="font-medium">
                {t('restaurants.banner.daysLeft', { count: plan.daysLeft })}
              </span>
            </p>
          ) : null}
          <p className="text-sm opacity-85">
            {plan.endsAt
              ? t(`restaurants.banner.${plan.state === 'ended' ? 'endedOn' : 'endsOn'}`, {
                  date: vm.formatDate(plan.endsAt),
                })
              : t('restaurants.banner.noEnd')}
          </p>
        </div>
      </div>
      <dl className="grid gap-5 border-t-2 border-dashed border-current/40 px-6 py-4 sm:grid-cols-3">
        <Stub label={t('restaurants.fields.products')}>
          <bdi>
            {vm.formatNumber(restaurant.catalog.productCount)} /{' '}
            {plan.productLimit === null ? unlimited : vm.formatNumber(plan.productLimit)}
          </bdi>
          {plan.productUsePercent !== null ? (
            <span aria-hidden className="mt-2 block h-1.5 overflow-hidden rounded-full border">
              <span
                className="block h-full bg-current"
                style={{ width: `${String(plan.productUsePercent)}%` }}
              />
            </span>
          ) : null}
        </Stub>
        <Stub label={t('plans.feature.limit_users_per_branch')}>
          {plan.userLimit === null ? unlimited : vm.formatNumber(plan.userLimit)}
        </Stub>
        <Stub label={t('restaurants.fields.provider')}>
          {restaurant.subscription?.provider ?? t('restaurants.values.manual')}
        </Stub>
      </dl>
    </section>
  );
}
