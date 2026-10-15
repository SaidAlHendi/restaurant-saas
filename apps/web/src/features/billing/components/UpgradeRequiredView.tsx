import { Button, EmptyState } from '@app/ui';
import { LockIcon } from 'lucide-react';

import type { UpgradeRequiredViewModel } from '../hooks/use-upgrade-required.js';

/** Shown instead of a screen the current plan does not include. */
export function UpgradeRequiredView({
  title,
  description,
  hint,
  primaryLabel,
  onPrimary,
  backLabel,
  onBack,
}: UpgradeRequiredViewModel) {
  return (
    <div className="flex flex-1 items-center justify-center p-4 md:p-8">
      <EmptyState
        className="w-full max-w-lg bg-background"
        icon={<LockIcon aria-hidden />}
        title={title}
        description={
          <>
            {description}
            {hint !== null ? <span className="mt-2 block">{hint}</span> : null}
          </>
        }
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" size="touch" variant="outline" onClick={onBack}>
              {backLabel}
            </Button>
            {primaryLabel !== null ? (
              <Button type="button" size="touch" onClick={onPrimary}>
                {primaryLabel}
              </Button>
            ) : null}
          </div>
        }
      />
    </div>
  );
}
