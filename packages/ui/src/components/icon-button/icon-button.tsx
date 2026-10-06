import type * as React from 'react';

import { cn } from '../../lib/cn.js';
import { buttonVariants, type ButtonVariantProps } from '../button/button-variants.js';

const iconSizes = {
  sm: 'icon-sm',
  md: 'icon-md',
  lg: 'icon-lg',
  touch: 'icon-touch',
} as const;

export interface IconButtonProps
  extends
    Omit<React.ComponentProps<'button'>, 'children' | 'aria-label'>,
    Omit<ButtonVariantProps, 'size'> {
  /** Accessible name (already translated). Required because the button has no visible text. */
  label: string;
  icon: React.ReactNode;
  size?: keyof typeof iconSizes;
}

export function IconButton({
  className,
  variant = 'ghost',
  size = 'md',
  label,
  icon,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      data-slot="icon-button"
      type={type}
      aria-label={label}
      title={label}
      className={cn(buttonVariants({ variant, size: iconSizes[size] }), className)}
      {...props}
    >
      {icon}
    </button>
  );
}
