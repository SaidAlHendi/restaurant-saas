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
    <div className="flex min-h-0 flex-1 flex-col">
      <ConnectionBanner visible={showDisconnected} message={labels.disconnected} />
      <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-2 md:px-6">
        <h1 dir="auto" className="min-w-0 truncate text-lg font-semibold">
          {labels.title} · {branchName}
        </h1>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <BranchSwitcher {...branchSwitcher} className="min-w-0 flex-1 sm:w-48 sm:flex-none" />
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

      <div className="grid min-h-0 flex-1 gap-4 p-4 md:grid-cols-3 md:p-6">
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
