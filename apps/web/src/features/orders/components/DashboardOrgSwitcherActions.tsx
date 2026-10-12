import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@app/ui';

import type { OrgSwitcherViewModel } from '../hooks/use-org-switcher.js';

export function DashboardOrgSwitcherActions({
  orgs,
  org,
  showOrgSwitcher,
  switchingOrg,
  onOrgChange,
  labels,
}: OrgSwitcherViewModel) {
  if (!showOrgSwitcher) {
    return null;
  }
  return (
    <Select
      value={org?.id ?? ''}
      onValueChange={onOrgChange}
      disabled={switchingOrg}
    >
      <SelectTrigger className="w-56">
        <SelectValue placeholder={labels.selectOrg} />
      </SelectTrigger>
      <SelectContent>
        {orgs.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
