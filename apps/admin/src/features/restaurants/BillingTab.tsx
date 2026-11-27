import type { AdminOrgDetail } from '@app/shared';
import { Badge } from '@app/ui';

import { Field, Section } from './DetailField.js';
import type { RestaurantDetailVm } from './use-restaurant-detail-page.js';

export function BillingTab({
  vm,
  restaurant,
}: {
  vm: RestaurantDetailVm;
  restaurant: AdminOrgDetail;
}) {
  const { t } = vm;
  const { subscription, planDetail } = restaurant;
  const none = <span className="font-normal text-muted-foreground">{t('restaurants.none')}</span>;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Section title={t('restaurants.sections.plan')}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label={t('restaurants.columns.plan')}>{restaurant.planName ?? none}</Field>
            <Field label={t('restaurants.fields.price')}>
              {planDetail
                ? t(`restaurants.values.${planDetail.perBranch ? 'perBranchMonth' : 'perMonth'}`, {
                    price: vm.money(planDetail.priceMinor, planDetail.currency),
                  })
                : none}
            </Field>
            <Field label={t('restaurants.fields.subscription')}>
              {subscription ? <Badge variant="outline">{subscription.status}</Badge> : none}
            </Field>
            <Field label={t('restaurants.fields.provider')}>
              {subscription?.provider ?? t('restaurants.values.manual')}
            </Field>
            <Field label={t('restaurants.fields.branchQuantity')}>
              {subscription ? vm.formatNumber(subscription.branchQuantity) : none}
            </Field>
            <Field label={t('restaurants.fields.trialEnds')}>
              {vm.formatDate(subscription?.trialEndsAt ?? null)}
            </Field>
            <Field label={t('restaurants.fields.periodEnd')}>
              {vm.formatDate(subscription?.currentPeriodEnd ?? null)}
            </Field>
            <Field label={t('restaurants.fields.canceled')}>
              {vm.formatDate(subscription?.canceledAt ?? null)}
            </Field>
            {vm.manualPayment ? (
              <>
                <Field label={t('restaurants.fields.manualPaid')}>
                  {vm.manualPayment.paid ? t('restaurants.paidYes') : t('restaurants.paidNo')}
                </Field>
                <Field label={t('restaurants.fields.manualAmount')}>
                  {vm.manualPayment.amount ?? none}
                </Field>
                <Field label={t('restaurants.fields.manualNote')}>
                  {vm.manualPayment.note ?? none}
                </Field>
              </>
            ) : null}
          </dl>
        </Section>
      </div>
      <Section title={t('restaurants.sections.limits')}>
        <ul className="divide-y text-sm">
          {planDetail?.features.map((feature) => (
            <li key={feature.key} className="flex items-center justify-between gap-3 py-2">
              <span>
                {t(`plans.feature.${feature.key.replaceAll('.', '_')}`, {
                  defaultValue: feature.key,
                })}
              </span>
              <span className="font-medium tabular-nums">
                {feature.limit !== null
                  ? vm.formatNumber(feature.limit)
                  : t(
                      feature.key.startsWith('limit')
                        ? 'plans.unlimited'
                        : 'restaurants.values.included',
                    )}
              </span>
            </li>
          )) ?? <li>{none}</li>}
        </ul>
      </Section>
    </div>
  );
}
