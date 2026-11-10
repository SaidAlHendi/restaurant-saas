import { ImageIcon, MinusIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';

import { IconButton } from '../icon-button/index.js';
import { cn } from '../../lib/cn.js';

export type CartLineModifier = {
  id: string;
  label: string;
};

export type CartLineProps = {
  name: string;
  unitPriceLabel: string;
  lineTotalLabel: string;
  quantity: number;
  modifiers: CartLineModifier[];
  note?: string;
  /** Shown in red under the options, e.g. when the product left the menu. */
  warning?: string;
  /** Small product photo; a placeholder is shown when missing. */
  imageUrl?: string | null;
  decreaseLabel: string;
  increaseLabel: string;
  removeLabel: string;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
  /** When set, an edit (pencil) button is shown, e.g. to change the options. */
  onEdit?: () => void;
  editLabel?: string;
  className?: string;
};

/** One cart row: photo, name with options, line total and a − quantity + stepper. */
export function CartLine({
  name,
  unitPriceLabel,
  lineTotalLabel,
  quantity,
  modifiers,
  note,
  warning,
  imageUrl,
  decreaseLabel,
  increaseLabel,
  removeLabel,
  onIncrease,
  onDecrease,
  onRemove,
  onEdit,
  editLabel,
  className,
}: CartLineProps) {
  return (
    <div
      data-slot="cart-line"
      className={cn('flex gap-3 border-b py-3 last:border-b-0', className)}
    >
      <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <ImageIcon aria-hidden className="size-5 text-muted-foreground opacity-50" />
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 text-sm font-medium leading-snug">{name}</p>
          <div className="-me-1 -mt-1 flex shrink-0 items-center">
            {onEdit ? (
              <IconButton
                type="button"
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
                label={editLabel ?? 'Edit'}
                icon={<PencilIcon />}
                onClick={onEdit}
              />
            ) : null}
            <IconButton
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              label={removeLabel}
              icon={<Trash2Icon />}
              onClick={onRemove}
            />
          </div>
        </div>
        {modifiers.length > 0 ? (
          <ul className="text-xs text-muted-foreground">
            {modifiers.map((mod) => (
              <li key={mod.id}>+ {mod.label}</li>
            ))}
          </ul>
        ) : null}
        {note && note.length > 0 ? (
          <p className="text-xs italic text-muted-foreground">{note}</p>
        ) : null}
        {warning && warning.length > 0 ? (
          <p role="alert" className="text-xs font-medium text-destructive">
            {warning}
          </p>
        ) : null}
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-primary tabular-nums">
              {lineTotalLabel}
            </span>
            {quantity > 1 ? (
              <span className="text-xs text-muted-foreground tabular-nums">
                {quantity} × {unitPriceLabel}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <IconButton
              type="button"
              size="md"
              variant="outline"
              className="rounded-full"
              label={decreaseLabel}
              icon={<MinusIcon />}
              onClick={onDecrease}
            />
            <span className="min-w-7 text-center text-sm font-semibold tabular-nums">
              {quantity}
            </span>
            <IconButton
              type="button"
              size="md"
              variant="outline"
              className="rounded-full"
              label={increaseLabel}
              icon={<PlusIcon />}
              onClick={onIncrease}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
