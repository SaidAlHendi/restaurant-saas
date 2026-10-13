import { Outlet } from 'react-router-dom';

import { PageHeader, Tabs, TabsList, TabsTrigger } from '@app/ui';

import type { SettingsLayoutViewModel } from '../hooks/use-settings-layout.js';

export type SettingsLayoutViewProps = SettingsLayoutViewModel;

export function SettingsLayoutView(props: SettingsLayoutViewProps) {
  const { tabs, showTabs, labels } = props;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title={labels.title} description={labels.description} />
      {showTabs ? (
        <Tabs value={tabs.find((t) => t.active)?.id ?? tabs[0]?.id}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} onClick={tab.onSelect}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : null}
      <Outlet />
    </div>
  );
}
