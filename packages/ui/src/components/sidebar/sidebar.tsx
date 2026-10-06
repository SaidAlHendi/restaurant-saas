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
            'hidden h-full shrink-0 flex-col border-e bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex',
            collapsed ? 'w-16' : 'w-64',
            className,
          )}
          {...props}
        >
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

export function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn('flex h-14 items-center gap-2 border-b px-3', className)}
      {...props}
    />
  );
}

export function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn('flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 py-3', className)}
      {...props}
    />
  );
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn('flex flex-col gap-2 border-t p-2', className)}
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
            'px-2 pb-1 text-xs font-medium text-muted-foreground',
            collapsed && 'sr-only',
          )}
        >
          {label}
        </p>
      ) : null}
      <ul className="flex flex-col gap-0.5">{children}</ul>
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
        'flex h-9 w-full items-center gap-3 rounded-md px-2 text-sm font-medium text-sidebar-foreground transition-colors',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        'data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground',
        '[&_svg]:size-4 [&_svg]:shrink-0',
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
export function SidebarTrigger(props: Omit<IconButtonProps, 'icon'>) {
  return <IconButton icon={<PanelLeftIcon className="rtl:-scale-x-100" />} {...props} />;
}
