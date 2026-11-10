import { ChevronDownIcon, InfoIcon } from 'lucide-react';
import { useState } from 'react';
import type * as React from 'react';

import { cn } from '../../lib/cn.js';
import { focusRing } from '../../lib/styles.js';
import { Alert, AlertDescription, AlertTitle } from '../alert/alert.js';

export interface InfoNoteProps {
  title: string;
  children: React.ReactNode;
  /** Open on first render. Default true. */
  defaultOpen?: boolean;
  /**
   * If set, the open/closed choice is remembered in localStorage under this key.
   * Storage failures are ignored.
   */
  storageKey?: string;
  /** Accessible labels for the toggle. */
  showLabel: string;
  hideLabel: string;
  className?: string;
}

function readStored(key: string | undefined): boolean | undefined {
  if (!key) {
    return undefined;
  }
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? undefined : value === 'open';
  } catch {
    return undefined;
  }
}

function writeStored(key: string | undefined, open: boolean) {
  if (!key) {
    return;
  }
  try {
    window.localStorage.setItem(key, open ? 'open' : 'closed');
  } catch {
    // Storage can be blocked; the note just won't remember its state.
  }
}

/** Calm, collapsible explanation box for a screen that is hard to understand at first sight. */
export function InfoNote({
  title,
  children,
  defaultOpen = true,
  storageKey,
  showLabel,
  hideLabel,
  className,
}: InfoNoteProps) {
  const [open, setOpen] = useState(() => readStored(storageKey) ?? defaultOpen);
  return (
    <Alert variant="info" role="note" data-slot="info-note" className={className}>
      <InfoIcon aria-hidden />
      <AlertTitle className="flex items-center justify-between gap-2">
        <span>{title}</span>
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? hideLabel : showLabel}
          className={cn('rounded-md p-0.5 text-muted-foreground hover:text-foreground', focusRing)}
          onClick={() => {
            const next = !open;
            setOpen(next);
            writeStored(storageKey, next);
          }}
        >
          <ChevronDownIcon
            aria-hidden
            className={cn('size-4 transition-transform', open && 'rotate-180')}
          />
        </button>
      </AlertTitle>
      {open ? <AlertDescription>{children}</AlertDescription> : null}
    </Alert>
  );
}
