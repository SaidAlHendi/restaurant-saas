import { LanguagesIcon, LogOutIcon, MoonIcon, SunIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn.js';
import { IconButton } from '../icon-button/index.js';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarModuleSwitch,
  SidebarPlanCard,
  SidebarTrigger,
  SidebarUser,
} from '../sidebar/index.js';

export interface AppShellNavItem {
  id: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
  /** Small marker shown at the end of the item, e.g. a lock. */
  badge?: ReactNode;
  onSelect: () => void;
}

export interface AppShellNavGroup {
  id: string;
  /** Group heading. Leave out for the main list. */
  label?: string;
  /** Indented list under the main one (sub-navigation). */
  nested?: boolean;
  items: AppShellNavItem[];
}

export interface AppShellModuleSwitch {
  label: string;
  currentLabel: string;
  currentIcon: ReactNode;
  options: { id: string; label: string; icon: ReactNode; onSelect: () => void }[];
}

export interface AppShellProps {
  children: ReactNode;
  /** Shown above the page, for example a billing alert. */
  banner?: ReactNode;
  brand: string;
  brandInitial: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  onOpenMobile: () => void;
  navGroups: AppShellNavGroup[];
  moduleSwitch?: AppShellModuleSwitch | null;
  planCard?: { eyebrow: string; name: string; detail?: string } | null;
  user?: { name: string; detail?: string | null } | null;
  isDark: boolean;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
  loggingOut: boolean;
  onLogout: () => void;
  labels: {
    sidebar: string;
    closeSidebar: string;
    toggleSidebar: string;
    theme: string;
    language: string;
    logout: string;
  };
}

/** Full-height app frame: sidebar (nav, theme, language, sign out) and the page next to it. */
export function AppShell({
  children,
  banner,
  brand,
  brandInitial,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onMobileOpenChange,
  onOpenMobile,
  navGroups,
  moduleSwitch,
  planCard,
  user,
  isDark,
  onToggleTheme,
  onToggleLanguage,
  loggingOut,
  onLogout,
  labels,
}: AppShellProps) {
  return (
    <div className="flex h-dvh overflow-hidden bg-muted">
      <Sidebar
        label={labels.sidebar}
        closeLabel={labels.closeSidebar}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileOpenChange={onMobileOpenChange}
      >
        <SidebarHeader className={collapsed ? 'justify-center px-0' : undefined}>
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-base font-bold text-primary-foreground"
          >
            {brandInitial}
          </span>
          {collapsed ? null : (
            <span dir="auto" className="truncate text-base font-bold">
              {brand}
            </span>
          )}
        </SidebarHeader>
        <SidebarContent>
          {moduleSwitch ? (
            <SidebarModuleSwitch
              label={moduleSwitch.label}
              currentLabel={moduleSwitch.currentLabel}
              currentIcon={moduleSwitch.currentIcon}
              options={moduleSwitch.options}
            />
          ) : null}
          {navGroups.map((group) => (
            <SidebarGroup
              key={group.id}
              label={group.label}
              className={group.nested ? '[&_ul]:ms-5 [&_ul]:border-s [&_ul]:ps-2' : undefined}
            >
              {group.items.map((item) => (
                <SidebarItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  active={item.active}
                  badge={item.badge}
                  onClick={item.onSelect}
                />
              ))}
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          {planCard ? <SidebarPlanCard {...planCard} /> : null}
          {user ? <SidebarUser name={user.name} detail={user.detail ?? undefined} /> : null}
          <div
            className={cn(
              'flex gap-1',
              collapsed ? 'flex-col items-center' : 'items-center justify-between',
            )}
          >
            <div className={cn('flex gap-1', collapsed && 'flex-col')}>
              <IconButton
                label={labels.theme}
                icon={isDark ? <SunIcon aria-hidden /> : <MoonIcon aria-hidden />}
                onClick={onToggleTheme}
              />
              <IconButton
                label={labels.language}
                icon={<LanguagesIcon aria-hidden />}
                onClick={onToggleLanguage}
              />
              <IconButton
                label={labels.logout}
                icon={<LogOutIcon aria-hidden className="rtl:-scale-x-100" />}
                disabled={loggingOut}
                onClick={onLogout}
              />
            </div>
            <div className="hidden md:block">
              <SidebarTrigger
                label={labels.toggleSidebar}
                variant="ghost"
                onClick={onToggleCollapsed}
              />
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mx-3 mt-3 flex h-14 shrink-0 items-center gap-2 rounded-lg border bg-background px-3 md:hidden">
          <SidebarTrigger label={labels.sidebar} onClick={onOpenMobile} />
          <span dir="auto" className="min-w-0 flex-1 truncate font-semibold">
            {brand}
          </span>
        </div>
        {banner}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
