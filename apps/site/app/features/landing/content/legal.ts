import type { LandingLocale } from '../../../lib/locale.js';
import type { LandingLegalContent, ThanksContent } from './types.js';

/**
 * DRAFT legal copy. Short and factual on purpose; it needs legal review before ad traffic.
 * The contact address comes from SITE_CONTACT_EMAIL (lib/brand.ts) and is appended by the view.
 */
const legalAr: LandingLegalContent = {
  back: 'العودة إلى الصفحة الرئيسية',
  privacy: {
    title: 'سياسة الخصوصية — صحتين',
    description: 'ما البيانات التي نجمعها عبر موقع صحتين، ولماذا، وكيف تطلب تصحيحها أو حذفها.',
    sections: [
      {
        heading: 'من نحن',
        paragraphs: ['صحتين نظام برمجي للمطاعم يضم الكاشير وشاشة المطبخ والقائمة الرقمية ولوحة المالك.'],
      },
      {
        heading: 'ما الذي نجمعه',
        paragraphs: [
          'عندما تطلب تجربة مجانية نجمع البيانات التي تدخلها: الاسم، واسم المطعم، ورقم الهاتف أو واتساب، والبريد الإلكتروني، والدولة، وعدد الفروع.',
          'نسجّل أيضًا مصدر زيارتك (معاملات UTM ومعرّفات النقر الإعلانية) لنعرف أي الحملات تعمل.',
        ],
      },
      {
        heading: 'لماذا نستخدمها',
        paragraphs: ['للتواصل معك بشأن طلبك، ولقياس أداء حملاتنا التسويقية.'],
      },
      {
        heading: 'ملفات الارتباط والتحليلات',
        paragraphs: [
          'لا تُحمَّل أدوات التحليلات والإعلانات إلا بعد موافقتك من شريط ملفات الارتباط. يمكنك تغيير اختيارك في أي وقت.',
        ],
      },
      {
        heading: 'حقوقك',
        paragraphs: ['يمكنك أن تطلب الاطلاع على بياناتك أو تصحيحها أو حذفها بمراسلتنا.'],
      },
    ],
  },
  terms: {
    title: 'شروط الاستخدام — صحتين',
    description: 'شروط استخدام موقع صحتين.',
    sections: [
      {
        heading: 'عن هذا الموقع',
        paragraphs: ['هذا الموقع للتعريف بصحتين. المعلومات فيه ليست عرضًا ملزمًا.'],
      },
      {
        heading: 'استخدام صحتين',
        paragraphs: [
          'يخضع استخدام التطبيق لاتفاق الاشتراك الذي توافق عليه عند فتح الحساب.',
          'الباقات والأسعار المعروضة هنا إرشادية وقد تتغير. يسري السعر المعروض عند الاشتراك.',
        ],
      },
      {
        heading: 'الاستخدام المقبول',
        paragraphs: ['لا تستخدم الموقع بطريقة تعطّله أو تضر بغيرك.'],
      },
    ],
  },
};

const legalEn: LandingLegalContent = {
  back: 'Back to the home page',
  privacy: {
    title: 'Privacy policy — Sahtain',
    description: 'What data we collect through the Sahtain website, why, and how to ask us to correct or delete it.',
    sections: [
      {
        heading: 'Who we are',
        paragraphs: ['Sahtain is restaurant software with a till, a kitchen display, a digital menu and an owner dashboard.'],
      },
      {
        heading: 'What we collect',
        paragraphs: [
          'When you request a free trial we collect the details you enter: name, restaurant name, phone or WhatsApp number, email, country and number of branches.',
          'We also record where you came from (UTM parameters and ad click IDs) to understand which campaigns work.',
        ],
      },
      {
        heading: 'Why we use it',
        paragraphs: ['To contact you about your request and to measure our marketing.'],
      },
      {
        heading: 'Cookies and analytics',
        paragraphs: [
          'Analytics and advertising scripts load only after you accept them in the cookie banner. You can change your choice at any time.',
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: ['You can ask to see, correct or delete your details by writing to us.'],
      },
    ],
  },
  terms: {
    title: 'Terms of use — Sahtain',
    description: 'Terms for using the Sahtain website.',
    sections: [
      {
        heading: 'About this site',
        paragraphs: ['This website introduces Sahtain. The information on it is not a binding offer.'],
      },
      {
        heading: 'Using Sahtain',
        paragraphs: [
          'Using the app is governed by the subscription agreement you accept when you open an account.',
          'The plans and prices shown here are indicative and may change. The price shown at signup applies.',
        ],
      },
      {
        heading: 'Acceptable use',
        paragraphs: ['Do not use the site in a way that disrupts it or harms others.'],
      },
    ],
  },
};

const thanksAr: ThanksContent = {
  title: 'شكرًا — صحتين',
  description: 'استلمنا طلبك.',
  heading: 'شكرًا، استلمنا طلبك.',
  body: 'سنتواصل معك قريبًا لفتح حسابك.',
  back: 'العودة إلى الصفحة الرئيسية',
};

const thanksEn: ThanksContent = {
  title: 'Thank you — Sahtain',
  description: 'We received your request.',
  heading: 'Thank you, we received your request.',
  body: 'We will be in touch shortly to open your account.',
  back: 'Back to the home page',
};

export function getLegalContent(locale: LandingLocale): LandingLegalContent {
  return locale === 'ar' ? legalAr : legalEn;
}

export function getThanksContent(locale: LandingLocale): ThanksContent {
  return locale === 'ar' ? thanksAr : thanksEn;
}
