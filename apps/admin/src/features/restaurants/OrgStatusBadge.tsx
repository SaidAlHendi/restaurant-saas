import { useTranslation } from 'react-i18next';

import type { AdminOrgStatus } from '@app/shared';
import { Badge, type BadgeProps } from '@app/ui';

const VARIANT: Record<AdminOrgStatus, NonNullable<BadgeProps['variant']>> = {
  trial: 'info',
  active: 'success',
  past_due: 'warning',
  suspended: 'destructive',
  cancelled: 'completed',
};

/** Colored status pill; the dot keeps it readable without color. */
export function OrgStatusBadge({ status }: { status: AdminOrgStatus }) {
  const { t } = useTranslation();
  return (
    <Badge variant={VARIANT[status]} data-status={status}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {t(`restaurants.status.${status}`)}
    </Badge>
  );
}
