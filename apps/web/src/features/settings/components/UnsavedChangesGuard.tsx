import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@app/ui';

import { useUnsavedChangesGuard } from '../hooks/use-unsaved-changes-guard.js';

export type UnsavedChangesGuardProps = {
  dirty: boolean;
};

/**
 * Asks before leaving a settings page that has unsaved edits (in-app navigation and
 * tab close/reload). Must render under a data router.
 */
export function UnsavedChangesGuard({ dirty }: UnsavedChangesGuardProps) {
  const { t } = useTranslation();
  const blocker = useUnsavedChangesGuard(dirty);

  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      onOpenChange={(open) => {
        if (!open && blocker.state === 'blocked') blocker.reset();
      }}
      title={t('settings.leaveDialog.title')}
      description={t('settings.leaveDialog.description')}
      confirmLabel={t('settings.leaveDialog.leave')}
      cancelLabel={t('settings.leaveDialog.stay')}
      variant="destructive"
      onConfirm={() => {
        if (blocker.state === 'blocked') blocker.proceed();
      }}
    />
  );
}
