import { Card } from '@app/ui';

import { useOverviewPage } from './use-overview-page.js';

export default function OverviewPage() {
  const { title, welcome, emptyHint } = useOverviewPage();
  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Card className="p-6">
        <p className="font-medium">{welcome}</p>
        <p className="mt-1 text-sm text-muted-foreground">{emptyHint}</p>
      </Card>
    </div>
  );
}
