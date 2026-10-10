import type { PublicMenuPayload } from '@app/shared';

type LanguageSwitcherProps = {
  locale: 'ar' | 'en';
  orgSlug: string;
  branchSlug?: string;
  org: PublicMenuPayload['org'];
};

function menuHref(loc: string, orgSlug: string, branchSlug?: string): string {
  return branchSlug === undefined ? `/${loc}/m/${orgSlug}` : `/${loc}/m/${orgSlug}/${branchSlug}`;
}

export function LanguageSwitcher({ locale, orgSlug, branchSlug, org }: LanguageSwitcherProps) {
  if (org.locales.length <= 1) {
    return null;
  }
  return (
    <nav aria-label={locale === 'ar' ? 'اللغة' : 'Language'} className="flex gap-2 text-sm">
      {org.locales.map((loc) => (
        <a
          key={loc}
          href={menuHref(loc, orgSlug, branchSlug)}
          className={loc === locale ? 'font-semibold underline' : 'text-muted-foreground hover:text-foreground'}
          hrefLang={loc}
          lang={loc}
        >
          {loc === 'ar' ? 'العربية' : 'English'}
        </a>
      ))}
    </nav>
  );
}
