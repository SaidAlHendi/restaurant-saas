import { redirect } from 'react-router';

import { landingPath, negotiateLocale } from '../lib/locale.js';

/**
 * `/` has no content of its own: it sends the visitor to `/ar` (default) or `/en` based on
 * Accept-Language. A 302 (not 301) because the target depends on the request, and `Vary` tells
 * caches so.
 */
export function loader({ request }: { request: Request }) {
  const locale = negotiateLocale(request.headers.get('accept-language'));
  return redirect(landingPath(locale), {
    status: 302,
    headers: { Vary: 'Accept-Language', 'Cache-Control': 'public, max-age=0, s-maxage=300' },
  });
}
