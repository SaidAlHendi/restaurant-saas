import '@fontsource-variable/cairo';
import '@app/ui/globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Sahtain Admin',
  robots: { index: false, follow: false },
};

// Applies the saved theme (or the OS preference) before first paint. Same logic as
// packages/ui/src/hooks/use-theme.ts, key "app.theme".
const THEME_SCRIPT = `(function(){var t;try{t=localStorage.getItem('app.theme')}catch(e){}if(t!=='cupcake'&&t!=='forest'){t=matchMedia('(prefers-color-scheme: dark)').matches?'forest':'cupcake'}document.documentElement.dataset.theme=t;try{var l=localStorage.getItem('app.lang');if(l==='ar'){document.documentElement.lang='ar';document.documentElement.dir='rtl'}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" data-theme="cupcake" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
