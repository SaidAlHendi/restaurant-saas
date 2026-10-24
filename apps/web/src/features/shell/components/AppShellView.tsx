import { LanguagesIcon, LockIcon, LogOutIcon, MoonIcon, SunIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  cn,
  IconButton,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarTrigger,
  SidebarUser,
  sidebarIconButton,
} from '@app/ui';

import { BillingBannerView } from '../../billing/components/BillingBannerView.js';
import type { AppShellViewModel } from '../use-app-shell.js';

export interface AppShellViewProps extends AppShellViewModel {
  children: ReactNode;
}

/** Eight-point star (two rotated squares) in saffron with the organization's initial. */
function BrandMark({ initial }: { initial: string }) {
  return (
    <span aria-hidden className="relative flex size-10 shrink-0 items-center justify-center">
      <svg viewBox="0 0 40 40" className="absolute inset-0 size-full text-sidebar-primary">
        <rect x="7" y="7" width="26" height="26" rx="3" fill="currentColor" />
        <rect
          x="7"
          y="7"
          width="26"
          height="26"
          rx="3"
          fill="currentColor"
          transform="rotate(45 20 20)"
        />
      </svg>
      <span className="font-display relative text-sm font-bold text-sidebar-primary-foreground">
        {initial}
      </span>
    </span>
  );
}

/** Full-height app frame: sidebar (nav, theme, language, sign out) and the page next to it. */
export function AppShellView({
  children,
  banner,
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
          <BrandMark initial={brandInitial} />
          {collapsed ? null : (
            <span dir="auto" className="font-display truncate text-base font-semibold">
              {brand}
            </span>
          )}
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
                  badge={
                    item.locked ? (
                      <LockIcon aria-label={labels.locked} className="my-0.5 size-3.5" />
                    ) : undefined
                  }
                  onClick={item.onSelect}
                />
              );
            })}
          </SidebarGroup>
          {menuSubNav.length > 0 ? (
            <SidebarGroup label={labels.menuSection} className="[&_ul]:ms-5 [&_ul]:border-s [&_ul]:ps-2">
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
            <SidebarGroup label={labels.posSection} className="[&_ul]:ms-5 [&_ul]:border-s [&_ul]:ps-2">
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
          {user ? <SidebarUser name={user.name} detail={user.detail ?? undefined} /> : null}
          <div
            className={cn(
              'flex gap-1',
              collapsed ? 'flex-col items-center' : 'items-center justify-between',
            )}
          >
            <div className={cn('flex gap-1', collapsed && 'flex-col')}>
              <IconButton
                className={sidebarIconButton}
                label={labels.theme}
                icon={isDark ? <SunIcon aria-hidden /> : <MoonIcon aria-hidden />}
                onClick={onToggleTheme}
              />
              <IconButton
                className={sidebarIconButton}
                label={labels.language}
                icon={<LanguagesIcon aria-hidden />}
                onClick={onToggleLanguage}
              />
              <IconButton
                className={sidebarIconButton}
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
        <div className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 md:hidden">
          <SidebarTrigger label={labels.sidebar} onClick={onOpenMobile} />
          <span dir="auto" className="min-w-0 flex-1 truncate font-semibold">
            {brand}
          </span>
        </div>
        {banner !== null ? <BillingBannerView banner={banner} /> : null}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
