import type { ReactNode } from 'react';

import { ConsentBanner } from '../../consent/components/ConsentBanner.js';
import type { SiteShellViewModel } from '../hooks/use-site-shell.js';
import { LandingFooter } from './LandingFooter.js';
import { LandingNav } from './LandingNav.js';
import { WhatsappButton } from './WhatsappButton.js';

export type SiteShellProps = {
  shell: SiteShellViewModel;
  children: ReactNode;
};

/** The frame every page shares: skip link, navbar, footer and the cookie banner. */
export function SiteShell({ shell, children }: SiteShellProps) {
  const { content } = shell;
  return (
    <div ref={shell.rootRef} id="top" className="lp-root min-h-screen bg-foreground p-2 text-foreground">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-background focus:px-4 focus:py-2"
      >
        {content.skipLink}
      </a>
      <div className="mx-auto grid max-w-[1600px] grid-cols-12 gap-2">
        <LandingNav content={content.nav} nav={shell.nav} navLinks={shell.navLinks} links={shell.links} />
        <main id="content" className="contents">
          {children}
        </main>
        <LandingFooter
          footer={content.footer}
          links={shell.links}
          onCookieSettings={shell.consent.reopen}
        />
      </div>
      <WhatsappButton
        href={shell.whatsapp.href}
        label={shell.whatsapp.label}
        raised={shell.consent.showBanner}
      />
      {shell.consent.showBanner ? (
        <ConsentBanner
          content={shell.consentContent}
          privacyHref={shell.links.privacy}
          onAccept={shell.consent.accept}
          onReject={shell.consent.reject}
        />
      ) : null}
    </div>
  );
}
