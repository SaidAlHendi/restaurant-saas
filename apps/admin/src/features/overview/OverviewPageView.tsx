'use client';

import { EmptyState, PageHeader } from '@app/ui';
import { LayoutDashboardIcon } from 'lucide-react';

import { useOverviewPage } from './use-overview-page';

export function OverviewPageView() {
  const { title, description, welcome, empty } = useOverviewPage();
  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      <PageHeader title={title} description={description} />
      <EmptyState icon={<LayoutDashboardIcon aria-hidden />} title={welcome ?? title} description={empty} />
    </div>
  );
}
