import { WifiOffIcon } from 'lucide-react';

import { cn } from '../../lib/cn.js';

export type ConnectionBannerProps = {
  /** Shown only when true. */
  visible: boolean;
  message: string;
  className?: string;
};

/** Full-width red bar for "disconnected / reconnecting". */
export function ConnectionBanner({ visible, message, className }: ConnectionBannerProps) {
  if (!visible) {
    return null;
  }
  return (
    <div
      role="alert"
      className={cn(
        'bg-destructive text-destructive-foreground flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium',
        className,
      )}
    >
      <WifiOffIcon className="size-4" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
