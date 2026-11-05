import { Card } from '@app/ui';

import { useComingSoonPage } from './use-coming-soon-page.js';

export default function ComingSoonPage() {
  const { title, heading, body } = useComingSoonPage();
  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Card className="p-6">
        <p className="font-medium">{heading}</p>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </Card>
    </div>
  );
}
