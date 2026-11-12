import '@app/ui/globals.css';
import './features/landing/landing.css';

import type { ReactNode } from 'react';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useRouteLoaderData,
} from 'react-router';

import { getSocialLinks, getWhatsappNumber } from './lib/env.server.js';
import type { RootLoaderData } from './lib/root-data.js';

export const links = () => [
  { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
  { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
  { rel: 'manifest', href: '/site.webmanifest' },
];

export function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const segment = url.pathname.split('/').filter(Boolean)[0];
  const locale = segment === 'ar' || segment === 'en' ? segment : 'en';
  return {
    locale,
    dir: locale === 'ar' ? 'rtl' : 'ltr',
    whatsappNumber: getWhatsappNumber(),
    social: getSocialLinks(),
  } satisfies RootLoaderData;
}

export function Layout({ children }: { children: ReactNode }) {
  const data = useRouteLoaderData<RootLoaderData>('root');
  const locale = data?.locale ?? 'en';
  const dir = data?.dir ?? 'ltr';

  return (
    <html lang={locale} dir={dir} data-theme="cupcake">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: { error: unknown }) {
  const { pathname } = useLocation();
  if (isRouteErrorResponse(error) && error.status === 404) {
    const ar = pathname.split('/').filter(Boolean)[0] === 'ar';
    return (
      <main
        dir={ar ? 'rtl' : 'ltr'}
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"
      >
        <img
          src="/404-empty-plate.png"
          alt=""
          width={400}
          height={301}
          className="h-auto w-full max-w-sm rounded-lg"
        />
        <h1 className="text-2xl font-semibold">
          {ar ? 'لم نجد هذه الصفحة' : "We can't find that page"}
        </h1>
        <p className="max-w-md text-muted-foreground">
          {ar
            ? 'الصفحة غير موجودة أو تم نقلها.'
            : "The page you're looking for doesn't exist or has moved."}
        </p>
        <a href={ar ? '/ar' : '/en'} className="font-medium underline">
          {ar ? 'العودة للرئيسية' : 'Back to home'}
        </a>
      </main>
    );
  }
  let message = 'Unexpected error';
  if (isRouteErrorResponse(error)) {
    message = error.statusText || message;
  } else if (error instanceof Error) {
    message = error.message;
  }
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Error</h1>
      <p className="text-muted-foreground">{message}</p>
    </main>
  );
}
