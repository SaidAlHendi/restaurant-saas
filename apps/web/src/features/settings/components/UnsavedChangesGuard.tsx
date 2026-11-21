import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker } from 'react-router-dom';

import { ConfirmDialog } from '@app/ui';

export type UnsavedChangesGuardProps = {
  dirty: boolean;
};

/**
 * Asks before leaving a settings page that has unsaved edits (in-app navigation and
 * tab close/reload). Must render under a data router.
 */
export function UnsavedChangesGuard({ dirty }: UnsavedChangesGuardProps) {
  const { t } = useTranslation();
  const blocker = useBlocker(dirty);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [dirty]);

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
