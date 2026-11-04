import type * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { ChevronDownIcon, PanelLeftIcon } from 'lucide-react';

import { cn } from '../../lib/cn.js';
import { useDirection } from '../../lib/direction.js';
import { SidebarContext, useSidebarContext } from '../../lib/sidebar-context.js';
import { focusRing } from '../../lib/styles.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../dropdown-menu/dropdown-menu.js';
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
            collapsed ? 'w-[4.5rem]' : 'w-64',
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
      className={cn('flex h-16 shrink-0 items-center gap-3 border-b px-4', className)}
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
      className={cn('flex shrink-0 flex-col gap-2 border-t px-3 py-3', className)}
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
            'px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-accent-2',
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
        'flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        'data-[active=true]:bg-accent-2/10 data-[active=true]:font-bold data-[active=true]:text-primary data-[active=true]:[&_svg]:text-primary',
        '[&_svg]:size-[1.0625rem] [&_svg]:shrink-0',
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
        'bg-muted/60 flex items-center gap-3 rounded-md p-2',
        collapsed && 'justify-center bg-transparent p-0',
        className,
      )}
      title={collapsed ? name : undefined}
      {...props}
    >
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground"
      >
        {initials || '?'}
      </span>
      {collapsed ? (
        <span className="sr-only">{name}</span>
      ) : (
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{name}</span>
          {detail ? <span className="truncate text-xs text-muted-foreground">{detail}</span> : null}
        </span>
      )}
    </div>
  );
}

export interface SidebarPlanCardProps extends React.ComponentProps<'div'> {
  eyebrow: string;
  name: string;
  /** Optional detail under the name, e.g. "9 days left". */
  detail?: string;
  /** 0 to 100; omit to hide the progress bar. */
  progress?: number;
}

/** Small plan summary above the user row (hidden when the sidebar is collapsed). */
export function SidebarPlanCard({
  eyebrow,
  name,
  detail,
  progress,
  className,
  ...props
}: SidebarPlanCardProps) {
  const { collapsed } = useSidebarContext();
  if (collapsed) {
    return null;
  }
  return (
    <div
      data-slot="sidebar-plan-card"
      className={cn('grid gap-1 rounded-md border p-3', className)}
      {...props}
    >
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {eyebrow}
      </span>
      <span className="text-sm font-bold text-primary">{name}</span>
      {detail ? <span className="text-xs text-muted-foreground">{detail}</span> : null}
      {progress === undefined ? null : (
        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-accent-2/15">
          <span
            className="block h-full rounded-full bg-accent-2"
            style={{ width: `${String(Math.min(100, Math.max(0, progress)))}%` }}
          />
        </span>
      )}
    </div>
  );
}

export interface SidebarModuleOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

export interface SidebarModuleSwitchProps {
  /** Label of the area you are in. */
  currentLabel: string;
  currentIcon: React.ReactNode;
  /** Other areas the user may open. */
  options: SidebarModuleOption[];
  /** Accessible name of the menu (already translated). */
  label: string;
}

/** Dark button under the brand that jumps between dashboard, POS and kitchen. */
export function SidebarModuleSwitch({
  currentLabel,
  currentIcon,
  options,
  label,
}: SidebarModuleSwitchProps) {
  const { collapsed, onNavigate } = useSidebarContext();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={collapsed ? `${label}: ${currentLabel}` : label}
          data-slot="sidebar-module-switch"
          className={cn(
            'flex h-11 w-full items-center gap-3 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground [&_svg]:size-4 [&_svg]:shrink-0',
            collapsed && 'justify-center px-0',
            focusRing,
          )}
        >
          {currentIcon}
          {collapsed ? null : (
            <>
              <span className="flex-1 truncate text-start">{currentLabel}</span>
              <ChevronDownIcon aria-hidden />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onSelect={() => {
              option.onSelect();
              onNavigate?.();
            }}
          >
            {option.icon}
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
