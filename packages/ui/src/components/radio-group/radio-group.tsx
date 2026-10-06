import type * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';

import { cn } from '../../lib/cn.js';
import { fieldInvalid, focusRing } from '../../lib/styles.js';

export type RadioGroupProps = React.ComponentProps<typeof RadioGroupPrimitive.Root>;

export function RadioGroup({ className, ...props }: RadioGroupProps) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn('grid gap-3', className)}
      {...props}
    />
  );
}

export type RadioGroupItemProps = React.ComponentProps<typeof RadioGroupPrimitive.Item>;

export function RadioGroupItem({ className, ...props }: RadioGroupItemProps) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        'relative aspect-square size-4 shrink-0 rounded-full border border-input bg-background shadow-xs transition-colors',
        'data-[state=checked]:border-primary disabled:cursor-not-allowed disabled:opacity-50',
        focusRing,
        fieldInvalid,
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="absolute inset-0 m-auto size-2 rounded-full bg-primary"
      />
    </RadioGroupPrimitive.Item>
  );
}
