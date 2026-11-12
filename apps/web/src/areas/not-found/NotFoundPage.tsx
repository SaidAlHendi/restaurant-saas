import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Button } from '@app/ui';

/** Shown for any URL that matches no route. */
export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <img
        src="/404-empty-plate.png"
        alt=""
        width={400}
        height={301}
        className="h-auto w-full max-w-sm rounded-lg"
      />
      <h1 className="text-2xl font-semibold">{t('notFoundPage.title')}</h1>
      <p className="max-w-md text-muted-foreground">{t('notFoundPage.body')}</p>
      <Button asChild>
        <Link to="/">{t('notFoundPage.home')}</Link>
      </Button>
    </main>
  );
}
