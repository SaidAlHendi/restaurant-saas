import { Button } from '@app/ui';

import type { ConsentContent } from '../content.js';

export type ConsentBannerProps = {
  content: ConsentContent;
  privacyHref: string;
  onAccept: () => void;
  onReject: () => void;
};

/** Small bottom banner. Both answers have the same weight, and nothing is blocked while it is open. */
export function ConsentBanner({ content, privacyHref, onAccept, onReject }: ConsentBannerProps) {
  return (
    <section
      aria-label={content.label}
      className="fixed inset-x-3 bottom-3 z-[70] mx-auto flex max-w-3xl flex-col gap-3 rounded-[10px] bg-card p-4 text-card-foreground shadow-[0_24px_50px_-18px_rgba(0,0,0,0.6)] ring-1 ring-border md:flex-row md:items-center md:gap-5 md:p-5"
    >
      <p className="flex-1 text-sm leading-6">
        {content.text}{' '}
        <a className="underline underline-offset-4" href={privacyHref}>
          {content.privacy}
        </a>
      </p>
      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="outline" size="touch" onClick={onReject}>
          {content.reject}
        </Button>
        <Button type="button" size="touch" onClick={onAccept}>
          {content.accept}
        </Button>
      </div>
    </section>
  );
}
