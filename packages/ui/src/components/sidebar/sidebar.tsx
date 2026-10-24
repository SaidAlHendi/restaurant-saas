import type * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { PanelLeftIcon } from 'lucide-react';

import { cn } from '../../lib/cn.js';
import { useDirection } from '../../lib/direction.js';
import { SidebarContext, useSidebarContext } from '../../lib/sidebar-context.js';
import { focusRing } from '../../lib/styles.js';
import { IconButton, type IconButtonProps } from '../icon-button/icon-button.js';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../sheet/sheet.js';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip/tooltip.js';

/** Ghost icon buttons on the dark sidebar surface. */
export const sidebarIconButton =
  'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground';

export interface SidebarProps extends React.ComponentProps<'aside'> {
  /** Desktop: icons only (state from useDisclosure in the layout hook). */
  collapsed?: boolean;
  /** Mobile (< md): the sidebar opens as a sheet from the start edge. */
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  /** Accessible name for the navigation (already translated), e.g. "Main menu". */
  label: string;
  /** Close button label for the mobile sheet. */
  closeLabel: string;
}

/** Dashboard navigation. Fixed column on desktop, sheet on phones. */
export function Sidebar({
  collapsed = false,
  mobileOpen = false,
  onMobileOpenChange,
  label,
  closeLabel,
  className,
  children,
  ...props
}: SidebarProps) {
  return (
    <>
      <SidebarContext.Provider value={{ collapsed }}>
        <aside
          data-slot="sidebar"
          data-collapsed={collapsed}
          aria-label={label}
          className={cn(
            'relative isolate hidden h-full shrink-0 flex-col overflow-hidden border-e border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex',
            collapsed ? 'w-[4.5rem]' : 'w-64',
            className,
          )}
          {...props}
        >
          <SidebarPattern />
          {children}
        </aside>
      </SidebarContext.Provider>
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="start"
          closeLabel={closeLabel}
          className="w-72 gap-0 bg-sidebar p-0 text-sidebar-foreground md:hidden"
        >
          <SheetTitle className="sr-only">{label}</SheetTitle>
          <SheetDescription className="sr-only">{label}</SheetDescription>
          <SidebarContext.Provider
            value={{
              collapsed: false,
              onNavigate: () => {
                onMobileOpenChange?.(false);
              },
            }}
          >
            <nav aria-label={label} className="flex h-full flex-col">
              {children}
            </nav>
          </SidebarContext.Provider>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Faint lattice at the top of the sidebar that fades into the sidebar color. */
function SidebarPattern() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 [mask-image:linear-gradient(to_bottom,black,transparent)]"
    >
      <span className="lattice absolute inset-0 bg-sidebar-primary opacity-[0.14]" />
    </span>
  );
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn('flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-4', className)}
      {...props}
    />
  );
}

export function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn('flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-4', className)}
      {...props}
    />
  );
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn('flex shrink-0 flex-col gap-2 border-t border-sidebar-border px-3 py-3', className)}
      {...props}
    />
  );
}

export interface SidebarGroupProps extends React.ComponentProps<'div'> {
  label?: React.ReactNode;
}

export function SidebarGroup({ label, className, children, ...props }: SidebarGroupProps) {
  const { collapsed } = useSidebarContext();
  return (
    <div data-slot="sidebar-group" className={cn('flex flex-col gap-1', className)} {...props}>
      {label ? (
        <p
          className={cn(
            'px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/55',
            collapsed && 'sr-only',
          )}
        >
          {label}
        </p>
      ) : null}
      <ul className="flex flex-col gap-1">{children}</ul>
    </div>
  );
}

export interface SidebarItemProps extends React.ComponentProps<'button'> {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  /** e.g. a count of new orders. */
  badge?: React.ReactNode;
  /** Render a router <Link> instead of a button. */
  asChild?: boolean;
}

export function SidebarItem({
  icon,
  label,
  active = false,
  badge,
  asChild = false,
  className,
  children,
  onClick,
  ...props
}: SidebarItemProps) {
  const { collapsed, onNavigate } = useSidebarContext();
  const dir = useDirection();
  const Comp = asChild ? Slot : 'button';
  const item = (
    <Comp
      data-slot="sidebar-item"
      data-active={active}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      className={cn(
        'relative flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/75 transition-colors',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        'data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground data-[active=true]:[&_svg]:text-sidebar-primary',
        'data-[active=true]:before:absolute data-[active=true]:before:inset-y-2 data-[active=true]:before:start-0 data-[active=true]:before:w-1 data-[active=true]:before:rounded-e-full data-[active=true]:before:bg-sidebar-primary',
        '[&_svg]:size-5 [&_svg]:shrink-0',
        collapsed && 'justify-center px-0',
        focusRing,
        'focus-visible:ring-offset-sidebar',
        className,
      )}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        onNavigate?.();
      }}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {icon}
          {collapsed ? null : <span className="flex-1 truncate text-start">{label}</span>}
          {!collapsed && badge ? (
            <span className="rounded-full bg-background px-1.5 text-xs text-foreground tabular-nums">
              {badge}
            </span>
          ) : null}
        </>
      )}
    </Comp>
  );
  return (
    <li>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{item}</TooltipTrigger>
          <TooltipContent side={dir === 'rtl' ? 'left' : 'right'}>{label}</TooltipContent>
        </Tooltip>
      ) : (
        item
      )}
    </li>
  );
}

/** Button that collapses the desktop sidebar or opens the mobile one. */
export function SidebarTrigger({ className, ...props }: Omit<IconButtonProps, 'icon'>) {
  return (
    <IconButton
      icon={<PanelLeftIcon className="rtl:-scale-x-100" />}
      className={cn(sidebarIconButton, className)}
      {...props}
    />
  );
}

export interface SidebarUserProps extends React.ComponentProps<'div'> {
  name: string;
  /** Second line, e.g. the email or the role. */
  detail?: string;
}

/** Signed-in user: initials avatar, name and detail (avatar only when collapsed). */
export function SidebarUser({ name, detail, className, ...props }: SidebarUserProps) {
  const { collapsed } = useSidebarContext();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  return (
    <div
      data-slot="sidebar-user"
      className={cn(
        'bg-sidebar-accent/70 flex items-center gap-3 rounded-xl p-2',
        collapsed && 'justify-center bg-transparent p-0',
        className,
      )}
      title={collapsed ? name : undefined}
      {...props}
    >
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground"
      >
        {initials || '?'}
      </span>
      {collapsed ? (
        <span className="sr-only">{name}</span>
      ) : (
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{name}</span>
          {detail ? (
            <span className="truncate text-xs text-sidebar-foreground/60">{detail}</span>
          ) : null}
        </span>
      )}
    </div>
  );
}
