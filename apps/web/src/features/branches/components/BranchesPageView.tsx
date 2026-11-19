import { ClockIcon, MapPinIcon } from 'lucide-react';

import { Badge, Button, Card, CardContent, PageHeader, Spinner } from '@app/ui';

import type { BranchesPageViewModel } from '../hooks/use-branches-page.js';
import type { NewBranchDialogViewModel } from '../hooks/use-new-branch-dialog.js';
import { NewBranchDialogView } from './NewBranchDialogView.js';

export type BranchesPageViewProps = BranchesPageViewModel & { newBranch: NewBranchDialogViewModel };

export function BranchesPageView(props: BranchesPageViewProps) {
  const { isLoading, isError, items, onOpen, onSwitch, labels, newBranch } = props;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={labels.title}
        description={labels.description}
        actions={<NewBranchDialogView {...newBranch} />}
      />
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner label={labels.loading} />
        </div>
      ) : isError ? (
        <p className="text-destructive">{labels.loadError}</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">{labels.empty}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((b) => (
            <Card key={b.id} className="gap-4 py-5">
              <CardContent className="flex flex-col gap-4 px-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold">{b.name}</h2>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {b.isCurrent ? <Badge>{labels.current}</Badge> : null}
                    {b.isActive ? null : <Badge variant="outline">{labels.inactive}</Badge>}
                  </div>
                </div>
                <div className="text-muted-foreground space-y-1.5 text-sm">
                  <p className="flex items-center gap-2">
                    <MapPinIcon className="size-4 shrink-0" aria-hidden />
                    <span>{b.address && b.address.length > 0 ? b.address : labels.noAddress}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <ClockIcon className="size-4 shrink-0" aria-hidden />
                    <span>{b.timezone}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onOpen(b.id);
                    }}
                  >
                    {labels.settings}
                  </Button>
                  {b.isCurrent ? null : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onSwitch(b.id);
                      }}
                    >
                      {labels.switchTo}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
