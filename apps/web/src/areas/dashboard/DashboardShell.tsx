import { Outlet } from 'react-router-dom';

import { AppTopbar, BranchSwitcher } from '@app/ui';

import type { DashboardShellViewModel } from './use-dashboard-shell.js';

export function DashboardShell({
  title,
  pageTitle,
  breadcrumb,
  userInitials,
  branchSwitcher,
  onBranchChange,
}: DashboardShellViewModel) {
  return (
    <>
      <AppTopbar
        breadcrumb={breadcrumb}
        title={pageTitle}
        actions={
          <>
            <BranchSwitcher
              {...branchSwitcher}
              className="w-56"
              onValueChange={onBranchChange}
            />
            {userInitials ? (
              <span
                aria-hidden
                className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
              >
                {userInitials}
              </span>
            ) : null}
          </>
        }
      />
      <header className="mx-3 mt-3 flex min-h-14 shrink-0 items-center gap-3 rounded-lg border bg-background px-3 py-2 md:hidden">
        <h1 dir="auto" className="sr-only">
          {title}
        </h1>
        <BranchSwitcher {...branchSwitcher} className="w-full" onValueChange={onBranchChange} />
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto p-3 md:p-8">
        <Outlet />
      </main>
    </>
  );
}
