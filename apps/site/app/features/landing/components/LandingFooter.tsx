import { Button } from '@app/ui';

import { SITE_CONTACT_EMAIL } from '../../../lib/brand.js';
import type { SocialLinks } from '../../../lib/social.js';
import type { LandingContent } from '../content/types.js';
import type { SiteShellViewModel } from '../hooks/use-site-shell.js';

export type LandingFooterProps = {
  footer: LandingContent['footer'];
  navLinks: SiteShellViewModel['navLinks'];
  links: SiteShellViewModel['links'];
  social: SocialLinks;
  whatsappHref: string;
  switchName: string;
  brand: string;
  cta: string;
  onCookieSettings: () => void;
};

/** Brand glyphs (Simple Icons, CC0), drawn inline so no icon font or request is needed. */
function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-current">
      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 1 0 0-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 0 1-2.88 0 1.44 1.44 0 0 1 2.88 0z" />
    </svg>
  );
}

function FacebookGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-current">
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
    </svg>
  );
}

const COLUMN_TITLE = 'lp-display text-xl text-background';
const LINK = 'text-lg text-accent-2 underline-offset-4 transition-colors hover:text-background hover:underline';

export function LandingFooter({
  footer,
  navLinks,
  links,
  social,
  whatsappHref,
  switchName,
  brand,
  cta,
  onCookieSettings,
}: LandingFooterProps) {
  return (
    <footer className="col-span-12 px-3 pt-8 pb-4 text-accent-2 md:px-6">
      <div className="grid gap-10 md:grid-cols-12">
        <div className="md:col-span-4">
          <a href={links.home} className="lp-display text-5xl text-primary">
            {brand}
          </a>
          <p className="mt-3 max-w-[22em] text-lg">{footer.tagline}</p>
          <Button asChild size="lg" className="mt-5">
            <a href={links.contact}>{cta}</a>
          </Button>
        </div>

        <nav aria-label={footer.exploreTitle} className="md:col-span-2">
          <h2 className={COLUMN_TITLE}>{footer.exploreTitle}</h2>
          <ul className="mt-3 grid gap-2">
            {navLinks.map((link) => (
              <li key={link.key}>
                <a className={LINK} href={link.href}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={footer.legalTitle} className="md:col-span-2">
          <h2 className={COLUMN_TITLE}>{footer.legalTitle}</h2>
          <ul className="mt-3 grid gap-2">
            <li>
              <a className={LINK} href={links.privacy}>
                {footer.privacy}
              </a>
            </li>
            <li>
              <a className={LINK} href={links.terms}>
                {footer.terms}
              </a>
            </li>
            <li>
              <button type="button" className={LINK} onClick={onCookieSettings}>
                {footer.cookieSettings}
              </button>
            </li>
          </ul>
        </nav>

        <div className="md:col-span-4">
          <h2 className={COLUMN_TITLE}>{footer.contactTitle}</h2>
          <ul className="mt-3 grid gap-2">
            <li>
              <a className={LINK} href={links.mailto}>
                {footer.email}: {SITE_CONTACT_EMAIL}
              </a>
            </li>
            <li>
              <a className={LINK} href={whatsappHref} target="_blank" rel="noopener noreferrer">
                {footer.whatsapp}
              </a>
            </li>
            <li>
              <a className={LINK} href={links.switchHref} lang={links.switchLang} hrefLang={links.switchLang}>
                {footer.language}: {switchName}
              </a>
            </li>
          </ul>
          <div className="mt-4 flex items-center gap-2">
            <a
              className="grid size-11 place-items-center rounded-full ring-1 ring-accent-2/40 ring-inset hover:bg-card/10 hover:text-background"
              href={social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={footer.instagram}
              title={footer.instagram}
            >
              <InstagramGlyph />
            </a>
            <a
              className="grid size-11 place-items-center rounded-full ring-1 ring-accent-2/40 ring-inset hover:bg-card/10 hover:text-background"
              href={social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={footer.facebook}
              title={footer.facebook}
            >
              <FacebookGlyph />
            </a>
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap justify-between gap-2 border-t border-accent-2/25 pt-4 text-base">
        <span>{footer.rights}</span>
        <span>{footer.madeFor}</span>
      </div>
    </footer>
  );
}
