import { ADMIN_ORG_HISTORY_LIMIT, type AdminOrgDetail } from '@app/shared';
import { Card, EmptyState } from '@app/ui';

import type { RestaurantDetailVm } from './use-restaurant-detail-page.js';

export function HistoryTab({
  vm,
  restaurant,
}: {
  vm: RestaurantDetailVm;
  restaurant: AdminOrgDetail;
}) {
  const { t } = vm;
  if (restaurant.history.length === 0) {
    return <EmptyState title={t('restaurants.history.empty')} />;
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        {t('restaurants.history.limit', { count: ADMIN_ORG_HISTORY_LIMIT })}
      </p>
      <Card className="py-0">
        <ol className="divide-y">
          {restaurant.history.map((entry) => (
            <li key={entry.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
              <span>
                <span className="font-medium">
                  {t(`restaurants.history.actions.${entry.action.replaceAll('.', '_')}`, {
                    defaultValue: entry.action,
                  })}
                </span>
                <span className="block text-muted-foreground">{entry.actorName}</span>
              </span>
              <time className="text-muted-foreground" dateTime={entry.createdAt}>
                {vm.formatDateTime(entry.createdAt)}
              </time>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
