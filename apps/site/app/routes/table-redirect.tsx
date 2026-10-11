import { redirect } from 'react-router';

import { fetchPublicTable } from '../lib/api.server.js';
import { menuPath, parseMenuLocale } from '../lib/menu-path.js';

export async function loader({ params }: { params: { token?: string } }) {
  const token = params.token;
  if (!token) {
    throw new Response('Not Found', { status: 404 });
  }
  const table = await fetchPublicTable(token);
  const locale = parseMenuLocale(table.defaultLocale) ?? 'en';
  const path = menuPath(locale, table.orgSlug, table.branchSlug);
  const url = `${path}?table=${encodeURIComponent(table.tableLabel)}`;
  throw redirect(url);
}

export default function TableRedirect() {
  return null;
}
