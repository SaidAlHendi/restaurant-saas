import { escapeHtml } from './escape-html.js';
import { PRINT_80MM_STYLES } from './print-styles.js';

export type PrintDocumentLocale = {
  lang: string;
  dir: 'ltr' | 'rtl';
};

export function printLocaleFromUi(locale: string): PrintDocumentLocale {
  const isArabic = locale.startsWith('ar');
  return {
    lang: isArabic ? 'ar' : 'en',
    dir: isArabic ? 'rtl' : 'ltr',
  };
}

export function formatPrintDateTime(input: {
  date: Date;
  timeZone: string;
  locale: string;
}): string {
  const intlLocale = input.locale.startsWith('ar') ? 'ar-SA' : 'en-SA';
  return new Intl.DateTimeFormat(intlLocale, {
    timeZone: input.timeZone,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(input.date);
}

export function buildPrintDocumentHtml(input: {
  title: string;
  bodyHtml: string;
  locale: PrintDocumentLocale;
}): string {
  const title = escapeHtml(input.title);
  return `<!DOCTYPE html>
<html lang="${escapeHtml(input.locale.lang)}" dir="${input.locale.dir}">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>${PRINT_80MM_STYLES}</style>
</head>
<body>${input.bodyHtml}</body>
</html>`;
}
