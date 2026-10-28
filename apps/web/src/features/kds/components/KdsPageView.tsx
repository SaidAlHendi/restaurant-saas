import { BellIcon, BellOffIcon, SettingsIcon } from 'lucide-react';

import {
  BranchSwitcher,
  Badge,
  cn,
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
  activeKey,
  onSelectColumn,
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
      <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 mx-3 mt-3 rounded-2xl border bg-background shadow-sm md:mx-0 md:mt-0 px-4 py-2 md:px-6">
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 dir="auto" className="truncate text-lg leading-tight font-semibold">
            {labels.title}
          </h1>
          <p dir="auto" className="text-muted-foreground truncate text-sm">
            {branchName}
          </p>
        </div>
        <div className="order-last w-full empty:hidden md:order-none md:w-44">
          <BranchSwitcher {...branchSwitcher} className="w-full" />
        </div>
        <div className="flex items-center gap-2">
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

      <div
        role="tablist"
        aria-label={labels.title}
        className="bg-background mx-3 mt-3 flex shrink-0 gap-1 rounded-2xl border p-1.5 shadow-sm md:hidden"
      >
        {columns.map((column) => {
          const selected = column.key === activeKey;
          return (
            <button
              key={column.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                onSelectColumn(column.key);
              }}
              className={cn(
                'flex h-11 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors',
                selected ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground',
              )}
            >
              {column.title}
              <Badge variant={column.status} className="tabular-nums">
                {column.cards.length}
              </Badge>
            </button>
          );
        })}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 p-3 md:grid-cols-3 md:px-0 md:pt-4 md:pb-0">
        {columns.map((column) => (
          <KdsColumn
            key={column.key}
            title={column.title}
            status={column.status}
            count={column.cards.length}
            emptyLabel={labels.emptyColumn}
            className={cn(column.key !== activeKey && 'max-md:hidden')}
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
