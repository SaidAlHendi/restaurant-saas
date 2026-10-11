import { MinusIcon, PlusIcon, Trash2Icon } from 'lucide-react';

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
  decreaseLabel: string;
  increaseLabel: string;
  removeLabel: string;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
  className?: string;
};

export function CartLine({
  name,
  unitPriceLabel,
  lineTotalLabel,
  quantity,
  modifiers,
  note,
  decreaseLabel,
  increaseLabel,
  removeLabel,
  onIncrease,
  onDecrease,
  onRemove,
  className,
}: CartLineProps) {
  return (
    <div className={cn('border-b py-3', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug">{name}</p>
          <p className="text-muted-foreground text-sm">{unitPriceLabel}</p>
          {modifiers.length > 0 ? (
            <ul className="text-muted-foreground mt-1 text-sm">
              {modifiers.map((mod) => (
                <li key={mod.id}>{mod.label}</li>
              ))}
            </ul>
          ) : null}
          {note && note.length > 0 ? (
            <p className="text-muted-foreground mt-1 text-sm italic">{note}</p>
          ) : null}
        </div>
        <p className="shrink-0 font-medium tabular-nums">{lineTotalLabel}</p>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <IconButton
            type="button"
            size="touch"
            variant="outline"
            label={decreaseLabel}
            icon={<MinusIcon className="size-5" />}
            onClick={onDecrease}
          />
          <span className="min-w-8 text-center text-base font-medium tabular-nums">{quantity}</span>
          <IconButton
            type="button"
            size="touch"
            variant="outline"
            label={increaseLabel}
            icon={<PlusIcon className="size-5" />}
            onClick={onIncrease}
          />
        </div>
        <IconButton
          type="button"
          size="touch"
          variant="ghost"
          label={removeLabel}
          icon={<Trash2Icon className="size-5" />}
          onClick={onRemove}
        />
      </div>
    </div>
  );
}
