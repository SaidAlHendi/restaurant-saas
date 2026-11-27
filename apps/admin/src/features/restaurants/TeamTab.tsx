import type { AdminOrgDetail } from '@app/shared';
import {
  Badge,
  Card,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@app/ui';

import type { RestaurantDetailVm } from './use-restaurant-detail-page.js';

const STATUS_VARIANT = { active: 'success', invited: 'info', disabled: 'completed' } as const;

export function TeamTab({
  vm,
  restaurant,
}: {
  vm: RestaurantDetailVm;
  restaurant: AdminOrgDetail;
}) {
  const { t } = vm;
  if (restaurant.team.length === 0) {
    return <EmptyState title={t('restaurants.team.empty')} />;
  }
  return (
    <Card className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('restaurants.team.name')}</TableHead>
            <TableHead>{t('restaurants.team.role')}</TableHead>
            <TableHead>{t('restaurants.team.branches')}</TableHead>
            <TableHead>{t('restaurants.team.status')}</TableHead>
            <TableHead>{t('restaurants.team.lastLogin')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {restaurant.team.map((member) => (
            <TableRow key={member.membershipId}>
              <TableCell>
                <span className="block font-medium">{member.name}</span>
                {member.email ? (
                  <span className="block text-xs text-muted-foreground" dir="ltr">
                    {member.email}
                  </span>
                ) : null}
              </TableCell>
              <TableCell>{member.roleName}</TableCell>
              <TableCell>
                {member.allBranches
                  ? t('restaurants.values.allBranches')
                  : member.branchNames.join(' / ') || t('restaurants.none')}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[member.status]}>
                  {t(`restaurants.team.${member.status}`)}
                </Badge>
              </TableCell>
              <TableCell>
                {member.lastLoginAt
                  ? vm.formatDateTime(member.lastLoginAt)
                  : t('restaurants.team.never')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
