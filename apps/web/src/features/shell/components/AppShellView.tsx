import { LanguagesIcon, LogOutIcon, MoonIcon, SunIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarTrigger,
  SidebarUser,
} from '@app/ui';

import type { AppShellViewModel } from '../use-app-shell.js';

export interface AppShellViewProps extends AppShellViewModel {
  children: ReactNode;
}

/** Full-height app frame: sidebar (nav, theme, language, sign out) and the page next to it. */
export function AppShellView({
  children,
  brand,
  brandInitial,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onMobileOpenChange,
  onOpenMobile,
  navItems,
  menuSubNav,
  posSubNav,
  user,
  isDark,
  onToggleTheme,
  onToggleLanguage,
  loggingOut,
  onLogout,
  labels,
}: AppShellViewProps) {
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
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground"
          >
            {brandInitial}
          </span>
          {collapsed ? null : <span className="truncate text-base font-bold">{brand}</span>}
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarItem
                  key={item.id}
                  icon={<Icon aria-hidden />}
                  label={item.label}
                  active={item.active}
                  onClick={item.onSelect}
                />
              );
            })}
          </SidebarGroup>
          {menuSubNav.length > 0 ? (
            <SidebarGroup label={labels.menuSection}>
              {menuSubNav.map((item) => (
                <SidebarItem
                  key={item.to}
                  icon={<span className="size-1.5 rounded-full bg-current" aria-hidden />}
                  label={item.label}
                  active={item.active}
                  onClick={item.onSelect}
                />
              ))}
            </SidebarGroup>
          ) : null}
          {posSubNav.length > 0 ? (
            <SidebarGroup label={labels.posSection}>
              {posSubNav.map((item) => (
                <SidebarItem
                  key={item.to}
                  icon={<span className="size-1.5 rounded-full bg-current" aria-hidden />}
                  label={item.label}
                  active={item.active}
                  onClick={item.onSelect}
                />
              ))}
            </SidebarGroup>
          ) : null}
        </SidebarContent>
        <SidebarFooter>
          <SidebarGroup>
            <SidebarItem
              icon={isDark ? <SunIcon aria-hidden /> : <MoonIcon aria-hidden />}
              label={labels.theme}
              onClick={onToggleTheme}
            />
            <SidebarItem
              icon={<LanguagesIcon aria-hidden />}
              label={labels.language}
              onClick={onToggleLanguage}
            />
            <SidebarItem
              icon={<LogOutIcon aria-hidden className="rtl:-scale-x-100" />}
              label={labels.logout}
              disabled={loggingOut}
              onClick={onLogout}
            />
          </SidebarGroup>
          {user ? (
            <SidebarUser name={user.name} detail={user.detail ?? undefined} className="mt-1" />
          ) : null}
          <div className="hidden md:block">
            <SidebarTrigger
              label={labels.toggleSidebar}
              variant="ghost"
              className={collapsed ? 'mx-auto' : undefined}
              onClick={onToggleCollapsed}
            />
          </div>
        </SidebarFooter>
      </Sidebar>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 md:hidden">
          <SidebarTrigger label={labels.sidebar} onClick={onOpenMobile} />
          <span className="truncate font-semibold">{brand}</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
