import { Navigate } from 'react-router-dom';

import { MenuLookPageView } from '../components/MenuLookPageView.js';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard.js';
import { useMenuLookPage } from '../hooks/use-menu-look-page.js';

export function MenuLookSettingsPage() {
  const vm = useMenuLookPage();

  if (vm.redirectTo) {
    return <Navigate to={vm.redirectTo} replace />;
  }

  return (
    <>
      <UnsavedChangesGuard dirty={vm.dirty} />
      <MenuLookPageView {...vm} />
    </>
  );
}
