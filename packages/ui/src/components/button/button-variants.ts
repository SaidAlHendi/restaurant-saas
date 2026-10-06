import { cva, type VariantProps } from 'class-variance-authority';

import { focusRing } from '../../lib/styles.js';

export const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    focusRing,
  ],
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/85',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        outline:
          'border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/85 focus-visible:ring-destructive',
        // Underline in the brand color; text stays foreground so it is readable in both themes.
        link: 'text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:decoration-foreground',
      },
      size: {
        sm: 'h-8 gap-1.5 px-3 text-xs',
        md: 'h-9 px-4',
        lg: 'h-10 px-6 text-base',
        touch: 'h-12 min-w-12 px-6 text-base [&_svg:not([class*=size-])]:size-5',
        'icon-sm': 'size-8',
        'icon-md': 'size-9',
        'icon-lg': 'size-10',
        'icon-touch': 'size-12 [&_svg:not([class*=size-])]:size-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
