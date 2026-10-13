import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { Spinner } from '@app/ui';

import { PosLockScreenView } from '../../features/pos/components/PosLockScreenView.js';
import { PosLockContext } from '../../features/pos/pos-lock-context.js';
import { usePosArea } from '../../features/pos/hooks/use-pos-area.js';

const PosPage = lazy(() => import('./PosPage.js'));
const PosOrdersPage = lazy(() => import('./PosOrdersPage.js'));

export default function PosArea() {
  const vm = usePosArea();

  if (!vm.bootstrapDone) {
    return (
      <div className="flex justify-center p-8">
        <Spinner label={vm.t('common.loading')} />
      </div>
    );
  }

  if (vm.showLockScreen) {
    return <PosLockScreenView {...vm.lockScreen} />;
  }

  return (
    <PosLockContext.Provider value={{ requestLock: vm.requestLock }}>
      <Suspense
        fallback={
          <div className="flex justify-center p-8">
            <Spinner label={vm.t('common.loading')} />
          </div>
        }
      >
        <Routes>
          <Route index element={<PosPage />} />
          <Route path="orders" element={<PosOrdersPage />} />
          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Routes>
      </Suspense>
    </PosLockContext.Provider>
  );
}
