import { Card, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@app/ui';

import { useDashboardPage } from './use-dashboard-page.js';

export function DashboardHome() {
  const { t, user, org, orgs, canManageBranches, switchingOrg, onOrgChange } = useDashboardPage();

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold">
          {t('dashboard.welcome', { name: user?.name ?? '' })}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">{t('dashboard.subtitle')}</p>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{t('dashboard.org')}</span>
            <Select
              value={org?.id ?? ''}
              onValueChange={(value) => {
                void onOrgChange(value);
              }}
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
        </div>
        {canManageBranches ? (
          <p className="text-muted-foreground text-sm">{t('dashboard.canManageBranches')}</p>
        ) : null}
      </Card>
    </div>
  );
}
