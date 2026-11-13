import './auth-fonts.css';

import { useTranslation } from 'react-i18next';

const DISPLAY = "'Lalezar', 'IBM Plex Sans Arabic', ui-sans-serif, system-ui, sans-serif";
const TEXT = "'IBM Plex Sans Arabic', ui-sans-serif, system-ui, sans-serif";

/** Brand panel beside the sign-in form (large screens): full-bleed illustration, Lalezar wordmark and a short line. */
export function AuthAside() {
  const { t } = useTranslation();
  return (
    <div className="absolute inset-0 text-white" style={{ background: '#bb4e27', fontFamily: TEXT }}>
      <img src="/login-art.png" alt="" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="relative flex h-full flex-col justify-between p-10">
        <span className="text-6xl leading-none text-white" style={{ fontFamily: DISPLAY }}>
          صحتين
        </span>
        <div>
          <h2 className="max-w-[10em] text-[clamp(40px,4.4vw,72px)] leading-[1.05]" style={{ fontFamily: DISPLAY }}>
            {t('auth.aside.title')}
          </h2>
          <p className="mt-3 max-w-[24em] text-lg opacity-90">{t('auth.aside.body')}</p>
        </div>
      </div>
    </div>
  );
}
