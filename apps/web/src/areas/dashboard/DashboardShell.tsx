import { Outlet } from 'react-router-dom';

import { BranchSwitcher } from '@app/ui';

import type { DashboardShellViewModel } from './use-dashboard-shell.js';

export function DashboardShell({ title, branchSwitcher, onBranchChange }: DashboardShellViewModel) {
  return (
    <>
      <header className="flex min-h-16 shrink-0 items-center gap-3 mx-3 mt-3 rounded-2xl border bg-background shadow-sm md:mx-0 md:mt-0 px-4 py-2 md:px-6">
        <h1 dir="auto" className="hidden truncate text-lg font-semibold md:block">{title}</h1>
        <div className="w-full md:ms-auto md:w-56">
          <BranchSwitcher {...branchSwitcher} className="w-full" onValueChange={onBranchChange} />
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto p-3 md:px-1 md:pt-4 md:pb-1">
        <Outlet />
      </main>
    </>
  );
}
