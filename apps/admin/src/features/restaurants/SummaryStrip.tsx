import { BanknoteIcon, ReceiptTextIcon, StoreIcon, UsersIcon } from 'lucide-react';

import type { AdminOrgDetail } from '@app/shared';
import { StatCard } from '@app/ui';

import type { RestaurantDetailVm } from './use-restaurant-detail-page.js';

/** The numbers support asks first. */
export function SummaryStrip({
  vm,
  restaurant,
}: {
  vm: RestaurantDetailVm;
  restaurant: AdminOrgDetail;
}) {
  const { t } = vm;
  const { orderStats } = restaurant;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={<ReceiptTextIcon />}
        label={t('restaurants.stats.orders')}
        value={vm.formatNumber(orderStats.last30Days)}
      />
      <StatCard
        icon={<BanknoteIcon />}
        label={t('restaurants.stats.sales')}
        value={
          orderStats.salesLast30Days.length === 0 ? (
            <bdi>{vm.money(0, restaurant.defaultCurrency)}</bdi>
          ) : (
            orderStats.salesLast30Days.map((sale) => (
              <span key={sale.currency} className="block">
                <bdi>{vm.money(sale.amountMinor, sale.currency)}</bdi>
              </span>
            ))
          )
        }
      />
      <StatCard
        icon={<StoreIcon />}
        label={t('restaurants.columns.branches')}
        value={vm.formatNumber(restaurant.branchCount)}
      />
      <StatCard
        icon={<UsersIcon />}
        label={t('restaurants.fields.members')}
        value={vm.formatNumber(restaurant.memberCount)}
      />
    </div>
  );
}
