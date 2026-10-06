/** Shared class fragments so every control gets the same focus and invalid look in both themes. */
export const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export const fieldFocus =
  'outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/60';

export const fieldInvalid =
  'aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30';

export const fieldBase =
  'border-input bg-background text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50';
