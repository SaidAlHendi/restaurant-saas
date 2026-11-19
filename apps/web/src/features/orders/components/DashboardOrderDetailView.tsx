import { Link } from 'react-router-dom';

import { EmptyState } from '@app/ui';

import type { DashboardOrderDetailPageViewModel } from '../hooks/use-dashboard-order-detail-page.js';
import { PosOrderActionBarView } from '../../pos/components/PosOrderActionBarView.js';
import { posActionMaps } from '../../pos/pos-action-maps.js';
import { PosOrderActionDialogView } from '../../pos/components/PosOrderActionDialogView.js';
import { PosPaymentDialogView } from '../../pos/components/PosPaymentDialogView.js';
import { PosReopenDialogView } from '../../pos/components/PosReopenDialogView.js';
import type { DashboardOrderActionsViewModel } from '../hooks/use-dashboard-order-actions.js';
import { DashboardOrgSwitcherActions } from './DashboardOrgSwitcherActions.js';
import { OrderDetailsSkeletonView } from './order-details/OrderDetailsBodyView.js';
import { OrderDetailsDocumentView } from './order-details/OrderDetailsDocumentView.js';

export type DashboardOrderDetailViewProps = DashboardOrderDetailPageViewModel & {
  actions?: DashboardOrderActionsViewModel;
};

/** Order page. The action bar shows only what the signed-in user may do; add items stays on the POS. */
export function DashboardOrderDetailView(props: DashboardOrderDetailViewProps) {
  const { orgSwitcher, backLink, isLoading, eventsLoading, notFound, details, labels, actions } = props;

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

  const actionBar =
    actions?.visible && actions.layout ? (
      <div role="group" aria-label={labels.actions} className="flex flex-col gap-2">
        <PosOrderActionBarView
          layout={actions.layout}
          {...posActionMaps(actions.pos, actions.onPay)}
          busy={actions.pos.statusChanging}
          labels={{
            more: actions.pos.labels.more,
            moreActions: actions.pos.labels.moreActions,
            manager: actions.pos.labels.manager,
          }}
        />
      </div>
    ) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {back}
        <DashboardOrgSwitcherActions {...orgSwitcher} />
      </div>
      <OrderDetailsDocumentView
        model={details}
        labels={{
          ...labels,
          due: labels.dueLabel,
          pager: labels.pagerLabel,
          customer: labels.customerLabel,
          notes: labels.notesLabel,
          createdBy: labels.createdByLabel,
        }}
        timelineLoading={eventsLoading}
        actions={actionBar}
      />
      {actions && actionBar ? (
        <>
          <PosOrderActionDialogView {...actions.pos.voidDialog} />
          <PosOrderActionDialogView {...actions.pos.cancelDialog} />
          <PosReopenDialogView {...actions.pos.reopen} />
          <PosPaymentDialogView {...actions.paymentDialog} />
        </>
      ) : null}
    </div>
  );
}
