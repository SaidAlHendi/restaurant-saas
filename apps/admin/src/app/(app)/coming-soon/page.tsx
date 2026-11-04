import { Suspense } from 'react';

import { ComingSoonPageView } from '@/features/placeholders/ComingSoonPageView';

export default function ComingSoonPage() {
  return (
    <Suspense>
      <ComingSoonPageView />
    </Suspense>
  );
}
