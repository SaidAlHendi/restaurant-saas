import type * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '../../lib/cn.js';
import { floatingAnimation, floatingSurface } from '../../lib/styles.js';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

export type PopoverContentProps = React.ComponentProps<typeof PopoverPrimitive.Content>;

export function PopoverContent({
  className,
  align = 'center',
  sideOffset = 4,
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          floatingSurface,
          floatingAnimation,
          'w-72 origin-(--radix-popover-content-transform-origin) p-4',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
