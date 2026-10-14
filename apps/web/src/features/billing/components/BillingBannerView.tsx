import { Alert, AlertDescription, Button } from '@app/ui';

import type { BillingBannerViewModel } from '../hooks/use-billing-banner.js';

/** One line above every dashboard screen: trial ending, trial ended or payment failed. */
export function BillingBannerView({ banner }: { banner: NonNullable<BillingBannerViewModel> }) {
  return (
    <Alert
      variant={banner.variant}
      role="status"
      className="shrink-0 rounded-none border-x-0 border-t-0"
    >
      <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-foreground">
        <span className="flex-1">{banner.message}</span>
        <Button type="button" size="sm" variant="outline" onClick={banner.onAction}>
          {banner.actionLabel}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
