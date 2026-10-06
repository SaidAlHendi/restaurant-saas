import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, SendIcon } from 'lucide-react';

import { Button } from '@app/ui';

import type { DevUiCopy } from '../dev-ui.copy.js';
import { ShowcaseRow, ShowcaseSection } from './ShowcaseSection.js';

export function ButtonsSection({ copy }: { copy: DevUiCopy }) {
  const b = copy.buttons;
  return (
    <ShowcaseSection title={copy.sections.buttons}>
      <ShowcaseRow label="variant">
        <Button>{b.primary}</Button>
        <Button variant="secondary">{b.secondary}</Button>
        <Button variant="outline">{b.outline}</Button>
        <Button variant="ghost">{b.ghost}</Button>
        <Button variant="destructive">{b.destructive}</Button>
        <Button variant="link">{b.link}</Button>
      </ShowcaseRow>
      <ShowcaseRow label="size">
        <Button size="sm">{b.small}</Button>
        <Button size="md">{b.medium}</Button>
        <Button size="lg">{b.large}</Button>
        <Button size="touch">
          <PlusIcon aria-hidden />
          {b.touch}
        </Button>
      </ShowcaseRow>
      <ShowcaseRow label="state">
        <Button disabled>{b.disabled}</Button>
        <Button variant="outline" disabled>
          {b.disabled}
        </Button>
        <Button isLoading>{b.sending}</Button>
        <Button variant="secondary">
          <SendIcon aria-hidden />
          {b.primary}
        </Button>
      </ShowcaseRow>
      <ShowcaseRow label="direction (arrows flip in RTL)">
        <Button variant="outline">
          <ChevronLeftIcon className="rtl:rotate-180" aria-hidden />
          {b.back}
        </Button>
        <Button>
          {b.next}
          <ChevronRightIcon className="rtl:rotate-180" aria-hidden />
        </Button>
      </ShowcaseRow>
    </ShowcaseSection>
  );
}
