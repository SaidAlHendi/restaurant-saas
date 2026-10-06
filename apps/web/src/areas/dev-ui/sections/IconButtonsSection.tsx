import { ChevronRightIcon, PlusIcon, SettingsIcon, Trash2Icon } from 'lucide-react';

import { IconButton } from '@app/ui';

import type { DevUiCopy } from '../dev-ui.copy.js';
import { ShowcaseRow, ShowcaseSection } from './ShowcaseSection.js';

export function IconButtonsSection({ copy }: { copy: DevUiCopy }) {
  const l = copy.iconButtons;
  return (
    <ShowcaseSection title={copy.sections.iconButtons}>
      <ShowcaseRow label="variant">
        <IconButton label={l.add} icon={<PlusIcon />} variant="default" />
        <IconButton label={l.settings} icon={<SettingsIcon />} variant="secondary" />
        <IconButton label={l.settings} icon={<SettingsIcon />} variant="outline" />
        <IconButton label={l.settings} icon={<SettingsIcon />} />
        <IconButton label={l.delete} icon={<Trash2Icon />} variant="destructive" />
        <IconButton label={l.delete} icon={<Trash2Icon />} disabled />
      </ShowcaseRow>
      <ShowcaseRow label="size: sm / md / lg / touch">
        <IconButton label={l.add} icon={<PlusIcon />} variant="outline" size="sm" />
        <IconButton label={l.add} icon={<PlusIcon />} variant="outline" size="md" />
        <IconButton label={l.add} icon={<PlusIcon />} variant="outline" size="lg" />
        <IconButton label={l.add} icon={<PlusIcon />} variant="default" size="touch" />
        <IconButton
          label={l.next}
          icon={<ChevronRightIcon className="rtl:rotate-180" />}
          variant="outline"
          size="touch"
        />
      </ShowcaseRow>
    </ShowcaseSection>
  );
}
