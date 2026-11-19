import { EllipsisIcon } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@app/ui';

import type { PosDetailAction, PosDetailActionLayout } from '../pos-order-detail.utils.js';

export type PosOrderActionBarViewProps = {
  layout: PosDetailActionLayout;
  run: Record<PosDetailAction, () => void>;
  actionLabel: Record<PosDetailAction, string>;
  busy: boolean;
  labels: { more: string; moreActions: string; manager: string };
};

/** One big primary button, a secondary row and a More menu. Shared by the POS sheet and the dashboard page. */
export function PosOrderActionBarView({ layout, run, actionLabel, busy, labels }: PosOrderActionBarViewProps) {
  const hasMenu =
    layout.more.length + layout.manager.length + layout.destructive.length > 0;
  return (
    <>
      {layout.primary ? (
        <Button
          type="button"
          size="touch"
          className="w-full text-base"
          disabled={busy}
          onClick={run[layout.primary]}
        >
          {actionLabel[layout.primary]}
        </Button>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {layout.secondary.map((action) => (
          <Button
            key={action}
            type="button"
            size="touch"
            variant="outline"
            className="min-w-0 flex-1"
            disabled={busy}
            onClick={run[action]}
          >
            {actionLabel[action]}
          </Button>
        ))}
        {hasMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="touch"
                variant="ghost"
                className="flex-none"
                aria-label={labels.moreActions}
              >
                <EllipsisIcon aria-hidden />
                {labels.more}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              {layout.more.map((action) => (
                <DropdownMenuItem key={action} className="min-h-11" onClick={run[action]}>
                  {actionLabel[action]}
                </DropdownMenuItem>
              ))}
              {layout.manager.length > 0 ? (
                <>
                  {layout.more.length > 0 ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuLabel>{labels.manager}</DropdownMenuLabel>
                  {layout.manager.map((action) => (
                    <DropdownMenuItem key={action} className="min-h-11" onClick={run[action]}>
                      {actionLabel[action]}
                    </DropdownMenuItem>
                  ))}
                </>
              ) : null}
              {layout.destructive.length > 0 ? (
                <>
                  <DropdownMenuSeparator />
                  {layout.destructive.map((action) => (
                    <DropdownMenuItem
                      key={action}
                      className="text-destructive min-h-11"
                      onClick={run[action]}
                    >
                      {actionLabel[action]}
                    </DropdownMenuItem>
                  ))}
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </>
  );
}
