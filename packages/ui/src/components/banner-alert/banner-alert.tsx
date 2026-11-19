import { Alert, AlertDescription } from '../alert/index.js';
import { Button } from '../button/index.js';

export interface BannerAlertProps {
  variant: 'warning' | 'destructive';
  message: string;
  actionLabel: string;
  onAction: () => void;
}

/** One-line alert with an action button, full width above a page. */
export function BannerAlert({ variant, message, actionLabel, onAction }: BannerAlertProps) {
  return (
    <Alert variant={variant} role="status" className="shrink-0 rounded-none border-x-0 border-t-0">
      <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-foreground">
        <span className="flex-1">{message}</span>
        <Button type="button" size="sm" variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
