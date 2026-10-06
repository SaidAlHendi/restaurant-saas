import type * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Loader2Icon } from 'lucide-react';

import { cn } from '../../lib/cn.js';
import { buttonVariants, type ButtonVariantProps } from './button-variants.js';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'touch';

export interface ButtonProps
  extends React.ComponentProps<'button'>, Omit<ButtonVariantProps, 'size'> {
  size?: ButtonSize;
  /** Render the child element (e.g. a router Link) with button styles. */
  asChild?: boolean;
  /** Shows a spinner and disables the button, e.g. while a request is sending. */
  isLoading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={asChild ? undefined : disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {isLoading ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
          {children}
        </>
      )}
    </Comp>
  );
}
