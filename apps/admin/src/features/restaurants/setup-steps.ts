import type { AdminOrgDetail } from '@app/shared';

/** What a restaurant needs before it can really work, and how much of each it has. */
export function setupSteps(restaurant: AdminOrgDetail | undefined) {
  const branches = restaurant?.branches ?? [];
  const steps = [
    { key: 'categories', count: restaurant?.catalog.categoryCount ?? 0 },
    { key: 'products', count: restaurant?.catalog.productCount ?? 0 },
    { key: 'tables', count: branches.reduce((sum, b) => sum + b.tableCount, 0) },
    {
      key: 'devices',
      count: branches.reduce(
        (sum, b) => sum + b.devices.filter((device) => device.status === 'active').length,
        0,
      ),
    },
    /** People besides the owner. */
    { key: 'staff', count: restaurant?.team.filter((m) => m.roleKey !== 'owner').length ?? 0 },
    { key: 'orders', count: restaurant?.orderStats.total ?? 0 },
  ];
  return { steps, done: steps.filter((step) => step.count > 0).length };
}
