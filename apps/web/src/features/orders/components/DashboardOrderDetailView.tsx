import { Link } from 'react-router-dom';

import { Card, EmptyState, PageHeader } from '@app/ui';

import type { DashboardOrderDetailPageViewModel } from '../hooks/use-dashboard-order-detail-page.js';
import { DashboardOrgSwitcherActions } from './DashboardOrgSwitcherActions.js';
import { OrderDetailsBodyView, OrderDetailsSkeletonView } from './order-details/OrderDetailsBodyView.js';
import { OrderDetailsHeaderView } from './order-details/OrderDetailsHeaderView.js';

export type DashboardOrderDetailViewProps = DashboardOrderDetailPageViewModel;

/** Read-only order page. Actions (pay, cancel, reopen) stay on the POS; see the PR notes. */
export function DashboardOrderDetailView(props: DashboardOrderDetailViewProps) {
  const { orgSwitcher, backLink, isLoading, eventsLoading, notFound, details, labels } = props;

  const back = (
    <Link to={backLink.to} className="text-primary text-sm font-medium hover:underline">
      {backLink.label}
    </Link>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <OrderDetailsSkeletonView label={labels.loading} />
      </div>
    );
  }

  if (notFound || !details) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <EmptyState title={labels.notFound} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {back}
      <PageHeader title={labels.title} actions={<DashboardOrgSwitcherActions {...orgSwitcher} />} />
      <Card className="gap-0 rounded-md p-4">
        <OrderDetailsHeaderView
          header={details.header}
          stepper={details.stepper}
          labels={{
            orderNumber: labels.orderNumber,
            progress: labels.progress,
            business: labels.business,
            created: labels.created,
            due: labels.dueLabel,
          }}
        />
      </Card>
      <OrderDetailsBodyView
        model={details}
        labels={labels}
        timeline={{ collapsible: false, loading: eventsLoading }}
      />
    </div>
  );
}
