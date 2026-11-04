'use client';

import { ConstructionIcon } from 'lucide-react';

import { Button, EmptyState, PageHeader } from '@app/ui';

import { useComingSoonPage } from './use-coming-soon-page';

export function ComingSoonPageView() {
  const { title, heading, description, backLabel, onBack } = useComingSoonPage();
  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      <PageHeader title={title} />
      <EmptyState
        icon={<ConstructionIcon aria-hidden />}
        title={heading}
        description={description}
        action={
          <Button type="button" variant="outline" onClick={onBack}>
            {backLabel}
          </Button>
        }
      />
    </div>
  );
}
