import { Outlet } from 'react-router-dom';

import { BranchSwitcher } from '@app/ui';

import type { DashboardShellViewModel } from './use-dashboard-shell.js';

export function DashboardShell({ title, branchSwitcher, onBranchChange }: DashboardShellViewModel) {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-background px-4 md:px-6">
        <h1 className="hidden truncate text-lg font-semibold md:block">{title}</h1>
        <div className="ms-auto w-56 max-w-[50%] min-w-[8rem]">
          <BranchSwitcher {...branchSwitcher} className="w-full" onValueChange={onBranchChange} />
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <Outlet />
      </main>
    </>
  );
}
