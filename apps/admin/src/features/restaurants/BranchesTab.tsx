import type { AdminOrgBranch, AdminOrgDetail } from '@app/shared';
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@app/ui';

import { Field } from './DetailField.js';
import type { RestaurantDetailVm } from './use-restaurant-detail-page.js';

const DEVICE_VARIANT = { active: 'success', pending: 'warning', revoked: 'completed' } as const;

function BranchCard({ vm, branch }: { vm: RestaurantDetailVm; branch: AdminOrgBranch }) {
  const { t } = vm;
  const orderTypes = [
    branch.supportsDineIn ? t('restaurants.values.dineIn') : null,
    branch.supportsTakeaway ? t('restaurants.values.takeaway') : null,
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span className="min-w-0 break-words">{branch.name}</span>
          <Badge variant={branch.isActive ? 'success' : 'completed'}>
            {branch.isActive ? t('restaurants.branchActive') : t('restaurants.branchInactive')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t('restaurants.fields.address')}>
            {branch.address ?? t('restaurants.none')}
          </Field>
          <Field label={t('restaurants.fields.slug')}>
            <span dir="ltr">{branch.slug}</span>
          </Field>
          <Field label={t('restaurants.fields.timezone')}>
            <span dir="ltr">{branch.timezone}</span>
          </Field>
          <Field label={t('restaurants.fields.currency')}>{branch.currency}</Field>
          <Field label={t('restaurants.fields.tax')}>
            {t(`restaurants.values.${branch.taxInclusive ? 'taxIncluded' : 'taxAdded'}`, {
              rate: vm.formatPercent(branch.taxRateBp),
            })}
          </Field>
          <Field label={t('restaurants.fields.dayStart')}>
            <span dir="ltr">{vm.formatHour(branch.dayStartHour)}</span>
          </Field>
          <Field label={t('restaurants.fields.orderTypes')}>
            {orderTypes.filter(Boolean).join(' / ')}
          </Field>
          <Field label={t('restaurants.fields.payment')}>
            {t(`restaurants.values.${branch.payBeforeSend ? 'payBeforeSend' : 'payAfter'}`)}
            <span className="block text-sm font-normal text-muted-foreground">
              {t(`restaurants.values.${branch.acceptsCard ? 'card' : 'cashOnly'}`)}
            </span>
          </Field>
          <Field label={t('restaurants.fields.pager')}>
            {t(`restaurants.values.${branch.pagerEnabled ? 'on' : 'off'}`)}
          </Field>
          <Field label={t('restaurants.fields.tables')}>{vm.formatNumber(branch.tableCount)}</Field>
          <Field label={t('restaurants.fields.orders30')}>
            {vm.formatNumber(branch.ordersLast30Days)}
          </Field>
          <Field label={t('restaurants.fields.lastOrder')}>
            {vm.formatDateTime(branch.lastOrderAt)}
          </Field>
        </dl>
        <div className="flex flex-col gap-2 border-t pt-4">
          <h3 className="text-sm font-semibold">{t('restaurants.fields.devices')}</h3>
          {branch.devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('restaurants.devices.none')}</p>
          ) : (
            <ul className="divide-y">
              {branch.devices.map((device) => (
                <li key={device.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <span className="font-medium">{device.name}</span>
                  <span className="text-muted-foreground">
                    {device.lastUsedAt
                      ? t('restaurants.devices.lastUsed', {
                          value: vm.formatDateTime(device.lastUsedAt),
                        })
                      : t('restaurants.devices.neverUsed')}
                  </span>
                  <Badge className="ms-auto" variant={DEVICE_VARIANT[device.status]}>
                    {t(`restaurants.devices.${device.status}`)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function BranchesTab({
  vm,
  restaurant,
}: {
  vm: RestaurantDetailVm;
  restaurant: AdminOrgDetail;
}) {
  if (restaurant.branches.length === 0) {
    return <EmptyState title={vm.t('restaurants.noBranches')} />;
  }
  return (
    <div className="flex flex-col gap-4">
      {restaurant.branches.map((branch) => (
        <BranchCard key={branch.id} vm={vm} branch={branch} />
      ))}
    </div>
  );
}
