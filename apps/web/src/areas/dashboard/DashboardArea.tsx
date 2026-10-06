import {
  Button,
  Card,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/ui';

import { RequireAuth } from '../../features/session/RequireAuth.js';
import { useDashboardPage } from './use-dashboard-page.js';

function DashboardContent() {
  const {
    t,
    user,
    org,
    orgs,
    branches,
    currentBranchId,
    canManageBranches,
    switchingOrg,
    loggingOut,
    onOrgChange,
    onBranchChange,
    onLogout,
  } = useDashboardPage();

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold">{t('dashboard.welcome', { name: user?.name ?? '' })}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t('dashboard.subtitle')}</p>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{t('dashboard.org')}</span>
            <Select
              value={org?.id ?? ''}
              onValueChange={(value) => void onOrgChange(value)}
              disabled={switchingOrg || orgs.length <= 1}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('dashboard.selectOrg')} />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{t('dashboard.branch')}</span>
            <Select
              value={currentBranchId ?? branches[0]?.id ?? ''}
              onValueChange={onBranchChange}
              disabled={branches.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('dashboard.selectBranch')} />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {canManageBranches ? (
          <p className="text-muted-foreground text-sm">{t('dashboard.canManageBranches')}</p>
        ) : null}
        <div>
          <Button type="button" variant="outline" onClick={() => void onLogout()} disabled={loggingOut}>
            {t('auth.logout')}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function DashboardArea() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
