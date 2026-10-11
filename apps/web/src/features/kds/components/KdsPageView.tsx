import { BellIcon, BellOffIcon, SettingsIcon } from 'lucide-react';

import {
  BranchSwitcher,
  ConnectionBanner,
  IconButton,
  KdsColumn,
  KdsOrderCard,
  Spinner,
} from '@app/ui';

import type { KdsPageViewModel } from '../hooks/use-kds-page.js';

import { KdsSettingsSheetView } from './KdsSettingsSheetView.js';
import { KdsSoundPromptView } from './KdsSoundPromptView.js';

export function KdsPageView({
  branchName,
  isLoading,
  isError,
  labels,
  columns,
  showDisconnected,
  soundEnabled,
  onToggleMute,
  showSoundPrompt,
  onEnableSound,
  onSkipSound,
  branchSwitcher,
  settingsSheet,
}: KdsPageViewModel) {
  if (isLoading) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <Spinner label={labels.loading} />
      </div>
    );
  }

  if (isError) {
    return <p className="text-destructive p-6">{labels.loadError}</p>;
  }

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[32rem] flex-col gap-3">
      <ConnectionBanner
        visible={showDisconnected}
        message={labels.disconnected}
        className="rounded-md"
      />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">
          {labels.title} · {branchName}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <BranchSwitcher {...branchSwitcher} className="w-48" />
          <IconButton
            type="button"
            size="touch"
            variant="outline"
            label={labels.mute}
            icon={
              soundEnabled ? <BellIcon className="size-5" /> : <BellOffIcon className="size-5" />
            }
            onClick={onToggleMute}
          />
          <IconButton
            type="button"
            size="touch"
            variant="outline"
            label={labels.settings}
            icon={<SettingsIcon className="size-5" />}
            onClick={() => {
              settingsSheet.onOpenChange(true);
            }}
          />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-3">
        {columns.map((column) => (
          <KdsColumn
            key={column.key}
            title={column.title}
            status={column.status}
            count={column.cards.length}
            emptyLabel={labels.emptyColumn}
          >
            {column.cards.map((c) => (
              <KdsOrderCard key={c.id} {...c.card} />
            ))}
          </KdsColumn>
        ))}
      </div>

      <KdsSoundPromptView
        open={showSoundPrompt}
        title={labels.enableSoundTitle}
        description={labels.enableSoundDescription}
        enableLabel={labels.enableSound}
        skipLabel={labels.skipSound}
        onEnable={onEnableSound}
        onSkip={onSkipSound}
      />
      <KdsSettingsSheetView {...settingsSheet} />
    </div>
  );
}
