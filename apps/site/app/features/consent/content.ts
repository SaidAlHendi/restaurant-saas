import type { LandingLocale } from '../../lib/locale.js';

export type ConsentContent = {
  label: string;
  text: string;
  accept: string;
  reject: string;
  privacy: string;
};

const ar: ConsentContent = {
  label: 'ملفات الارتباط',
  text: 'نستخدم أدوات تحليلات وإعلانات لنعرف أي حملاتنا تعمل. لن نحمّلها إلا بموافقتك.',
  accept: 'أوافق',
  reject: 'لا، شكرًا',
  privacy: 'سياسة الخصوصية',
};

const en: ConsentContent = {
  label: 'Cookies',
  text: 'We use analytics and advertising tools to learn which campaigns work. We load them only if you agree.',
  accept: 'Accept',
  reject: 'No, thanks',
  privacy: 'Privacy policy',
};

export function getConsentContent(locale: LandingLocale): ConsentContent {
  return locale === 'ar' ? ar : en;
}
