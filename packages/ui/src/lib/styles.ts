/** Shared class fragments so every control gets the same focus and invalid look in both themes. */
export const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export const fieldFocus =
  'outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/60';

export const fieldInvalid =
  'aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30';

export const fieldBase =
  'border-input bg-background text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50';

/** Enter/exit animation for floating content (popover, select, menu). Radix flips `side` in RTL. */
export const floatingAnimation =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2';

/** Surface for floating content. */
export const floatingSurface =
  'z-50 rounded-md border bg-popover text-popover-foreground shadow-md outline-hidden';

/** Row inside a menu, select or command list. */
export const menuItem =
  "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground";

/** Dimmed backdrop behind dialogs and sheets. */
export const overlay =
  'fixed inset-0 z-50 bg-overlay/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0';
