import { Button } from '@app/ui';

export interface CursorPagerProps {
  pageLabel: string;
  previousLabel: string;
  nextLabel: string;
  hasPrevious: boolean;
  hasNext: boolean;
  disabled?: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function CursorPager(props: CursorPagerProps) {
  if (!props.hasPrevious && !props.hasNext) return null;
  return (
    <nav className="flex items-center justify-between gap-3" aria-label={props.pageLabel}>
      <Button
        variant="outline"
        disabled={!props.hasPrevious || props.disabled}
        onClick={props.onPrevious}
      >
        {props.previousLabel}
      </Button>
      <span className="text-sm text-muted-foreground">{props.pageLabel}</span>
      <Button variant="outline" disabled={!props.hasNext || props.disabled} onClick={props.onNext}>
        {props.nextLabel}
      </Button>
    </nav>
  );
}
