import '@app/ui/globals.css';

import type { ReactNode } from 'react';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from 'react-router';

export const links = () => [];

type RootLoaderData = {
  locale: string;
  dir: 'rtl' | 'ltr';
};

export function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const segment = url.pathname.split('/').filter(Boolean)[0];
  const locale = segment === 'ar' || segment === 'en' ? segment : 'en';
  return { locale, dir: locale === 'ar' ? 'rtl' : 'ltr' } satisfies RootLoaderData;
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
