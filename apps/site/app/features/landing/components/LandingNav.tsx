import { Button, cn } from '@app/ui';

import type { LandingContent } from '../content/types.js';
import type { SiteShellViewModel } from '../hooks/use-site-shell.js';

export type LandingNavProps = {
  content: LandingContent['nav'];
  nav: SiteShellViewModel['nav'];
  navLinks: SiteShellViewModel['navLinks'];
  links: SiteShellViewModel['links'];
};

export function LandingNav({ content, nav, navLinks, links }: LandingNavProps) {
  return (
    <header className="sticky top-2 z-50 col-span-12 flex justify-center">
      <div
        className={cn(
          'relative flex w-full max-w-[1120px] items-center justify-between gap-3 rounded-full bg-background py-2 ps-2 pe-2 transition-shadow md:ps-3',
          nav.scrolled && 'shadow-[0_18px_40px_-14px_rgba(0,0,0,0.65)]',
        )}
      >
        <a
          href={links.home}
          aria-label={content.brandLabel}
          className="lp-display flex items-center gap-2 rounded-full bg-primary py-1 ps-1 pe-4 text-[28px] leading-none text-primary-foreground"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-background">
            <img src="/favicon.svg" alt="" width={28} height={28} className="size-7" />
          </span>
          <span>{content.brand}</span>
        </a>

        <nav aria-label={content.ariaLabel} className="hidden items-center gap-1 text-[15px] font-medium md:flex">
          {navLinks.map((link, index) => (
            <a
              key={link.key}
              href={link.href}
              aria-current={link.current}
              className={cn(
                'group flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-foreground/75 transition-colors hover:text-foreground',
                link.active && 'bg-foreground text-background hover:text-background',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'lp-display text-[13px] text-primary transition-transform group-hover:-translate-y-0.5',
                  link.active && 'text-warning',
                )}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={links.switchHref}
            lang={links.switchLang}
            hrefLang={links.switchLang}
            aria-label={content.switchName}
            className="hidden rounded-full px-3 py-2 text-[13px] font-medium ring-1 ring-foreground/30 ring-inset transition-colors hover:bg-foreground hover:text-background md:inline-block"
          >
            {content.switchLabel}
          </a>
          <Button asChild size="lg" className="hidden rounded-full md:inline-flex">
            <a href={links.contact}>{content.cta}</a>
          </Button>
          <button
            type="button"
            aria-expanded={nav.menuOpen}
            aria-controls="landing-menu"
            aria-label={content.menuLabel}
            onClick={nav.toggleMenu}
            className="group relative size-11 rounded-full bg-foreground text-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:hidden"
          >
            <span className="lp-burger-line top-[17px] group-aria-expanded:top-[21px] group-aria-expanded:rotate-45" />
            <span className="lp-burger-line top-[25px] group-aria-expanded:top-[21px] group-aria-expanded:-rotate-45" />
          </button>
        </div>

        <div
          id="landing-menu"
          className={cn(
            'lp-ticket absolute inset-x-2 top-[calc(100%+0.5rem)] gap-1 shadow-[0_24px_50px_-18px_rgba(0,0,0,0.6)] md:hidden',
            nav.menuOpen ? 'grid' : 'hidden',
          )}
        >
          {navLinks.map((link, index) => (
            <a
              key={link.key}
              href={link.href}
              onClick={nav.closeMenu}
              aria-current={link.current}
              className={cn(
                'flex items-baseline gap-3 rounded-lg px-3.5 py-3.5 text-[19px] font-medium hover:bg-accent',
                link.active && 'bg-accent',
              )}
            >
              <span aria-hidden className="lp-display text-[15px] text-primary">
                {String(index + 1).padStart(2, '0')}
              </span>
              {link.label}
            </a>
          ))}
          <a
            href={links.switchHref}
            lang={links.switchLang}
            hrefLang={links.switchLang}
            className="rounded-lg px-3.5 py-3.5 text-[19px] font-medium hover:bg-accent"
          >
            {content.switchName}
          </a>
          <Button asChild size="touch" className="mt-1.5 rounded-full">
            <a href={links.contact} onClick={nav.closeMenu}>
              {content.cta}
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
