import { Outlet } from 'react-router-dom';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarTrigger,
} from '@app/ui';

import type { DashboardShellViewModel } from './use-dashboard-shell.js';

export function DashboardShell({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onMobileOpenChange,
  onOpenMobile,
  navItems,
  menuSubNav,
  isMenuSection,
  pathname,
  onNavigate,
  sidebarLabel,
  closeLabel,
  brand,
  menuSectionLabel,
}: DashboardShellViewModel) {
  return (
    <div className="flex min-h-[calc(100dvh-6rem)] overflow-hidden rounded-xl border">
      <Sidebar
        label={sidebarLabel}
        closeLabel={closeLabel}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileOpenChange={onMobileOpenChange}
      >
        <SidebarHeader>
          <span className="truncate px-1 font-semibold">{collapsed ? '🍽' : brand}</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.end
                ? pathname === item.to
                : item.to === '/dashboard/menu'
                  ? pathname.startsWith('/dashboard/menu')
                  : pathname.startsWith(item.to);
              return (
                <SidebarItem
                  key={item.id}
                  icon={<Icon aria-hidden />}
                  label={item.label}
                  active={active}
                  onClick={() => {
                    onNavigate(item.to);
                  }}
                />
              );
            })}
          </SidebarGroup>
          {isMenuSection && menuSubNav.length > 0 ? (
            <SidebarGroup label={menuSectionLabel}>
              {menuSubNav.map((item) => (
                <SidebarItem
                  key={item.to}
                  icon={<span className="size-1.5 rounded-full bg-current" aria-hidden />}
                  label={item.label}
                  active={pathname === item.to}
                  onClick={() => {
                    onNavigate(item.to);
                  }}
                />
              ))}
            </SidebarGroup>
          ) : null}
        </SidebarContent>
      </Sidebar>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger
            label={sidebarLabel}
            onClick={() => {
              if (window.matchMedia('(min-width: 768px)').matches) {
                onToggleCollapsed();
              } else {
                onOpenMobile();
              }
            }}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
