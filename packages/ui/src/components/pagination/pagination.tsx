import type { ComponentProps } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react';

import { usePagination } from '../../hooks/use-pagination.js';
import { cn } from '../../lib/cn.js';
import { Button } from '../button/button.js';

interface NavLabels {
  /** Accessible name for the <nav>, e.g. "Pagination". */
  navigation: string;
  previous: string;
  next: string;
}

function PreviousButton({ label, ...props }: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button variant="ghost" className="gap-1 ps-2.5" {...props}>
      <ChevronLeftIcon className="rtl:rotate-180" aria-hidden />
      <span>{label}</span>
    </Button>
  );
}

function NextButton({ label, ...props }: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button variant="ghost" className="gap-1 pe-2.5" {...props}>
      <span>{label}</span>
      <ChevronRightIcon className="rtl:rotate-180" aria-hidden />
    </Button>
  );
}

export interface CursorPaginationProps {
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  /** Disables both buttons while a page is loading. */
  isLoading?: boolean;
  labels: NavLabels;
  /** Optional text in the middle, e.g. "Showing 51–100". */
  summary?: React.ReactNode;
  className?: string;
}

/** Previous / next for cursor-based lists (the API returns nextCursor, no total). */
export function CursorPagination({
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  isLoading = false,
  labels,
  summary,
  className,
}: CursorPaginationProps) {
  return (
    <nav
      data-slot="cursor-pagination"
      aria-label={labels.navigation}
      className={cn('flex items-center justify-between gap-2', className)}
    >
      <PreviousButton
        label={labels.previous}
        disabled={!hasPrevious || isLoading}
        onClick={onPrevious}
      />
      {summary ? <span className="text-sm text-muted-foreground">{summary}</span> : null}
      <NextButton label={labels.next} disabled={!hasNext || isLoading} onClick={onNext} />
    </nav>
  );
}

export interface NumberedPaginationProps {
  /** 1-based. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  labels: NavLabels & {
    /** Accessible name for a page button, e.g. (n) => `Page ${n}`. */
    page: (page: number) => string;
    morePages: string;
  };
  /** Formats page numbers, e.g. with Arabic digits. Defaults to plain numbers. */
  formatNumber?: (value: number) => string;
  className?: string;
}

export function NumberedPagination({
  page,
  pageCount,
  onPageChange,
  siblingCount,
  labels,
  formatNumber = String,
  className,
}: NumberedPaginationProps) {
  const { items, hasPrevious, hasNext } = usePagination({ page, pageCount, siblingCount });
  return (
    <nav
      data-slot="numbered-pagination"
      aria-label={labels.navigation}
      className={cn('mx-auto flex w-full justify-center', className)}
    >
      <ul className="flex flex-row flex-wrap items-center gap-1">
        <li>
          <PreviousButton
            label={labels.previous}
            disabled={!hasPrevious}
            onClick={() => {
              onPageChange(page - 1);
            }}
          />
        </li>
        {items.map((item) =>
          typeof item === 'number' ? (
            <li key={item}>
              <Button
                variant={item === page ? 'outline' : 'ghost'}
                size="sm"
                className="size-9 px-0"
                aria-label={labels.page(item)}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => {
                  onPageChange(item);
                }}
              >
                {formatNumber(item)}
              </Button>
            </li>
          ) : (
            <li key={item} aria-hidden className="flex size-9 items-center justify-center">
              <MoreHorizontalIcon className="size-4 text-muted-foreground" />
              <span className="sr-only">{labels.morePages}</span>
            </li>
          ),
        )}
        <li>
          <NextButton
            label={labels.next}
            disabled={!hasNext}
            onClick={() => {
              onPageChange(page + 1);
            }}
          />
        </li>
      </ul>
    </nav>
  );
}
