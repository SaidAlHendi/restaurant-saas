import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { Spinner } from '@app/ui';

import { UpgradeRequiredPage } from '../../features/billing/pages/UpgradeRequiredPage.js';
import { useKdsArea } from '../../features/kds/hooks/use-kds-area.js';
import { PosNoAccessView } from '../../features/pos/components/PosNoAccessView.js';

const KdsPage = lazy(() => import('./KdsPage.js'));

export default function KdsArea() {
  const vm = useKdsArea();

  if (!vm.bootstrapDone) {
    return (
      <div className="flex justify-center p-8">
        <Spinner label={vm.t('common.loading')} />
      </div>
    );
  }

  if (vm.showUpgrade) {
    return <UpgradeRequiredPage feature="kds.access" />;
  }

  if (!vm.canUseKds) {
    return <PosNoAccessView noAccess={vm.noAccess} />;
  }

  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-8">
          <Spinner label={vm.t('common.loading')} />
        </div>
      }
    >
      <Routes>
        <Route index element={<KdsPage />} />
        <Route path="*" element={<Navigate to="/kds" replace />} />
      </Routes>
    </Suspense>
  );
}
