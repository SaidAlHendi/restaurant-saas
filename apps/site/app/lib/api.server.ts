import {
  publicMenuPayloadSchema,
  publicSitemapResponseSchema,
  publicTablePayloadSchema,
  type PublicMenuPayload,
  type PublicSitemapResponse,
  type PublicTablePayload,
} from '@app/shared';

import { getSiteEnv } from './env.server.js';

export type PublicMenuFetchResult = {
  menu: PublicMenuPayload;
  cacheControl: string;
};

function apiUrl(path: string, search?: Record<string, string>): string {
  const url = new URL(path, getSiteEnv().PUBLIC_API_URL);
  if (search) {
    for (const [key, value] of Object.entries(search)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

export async function fetchPublicMenu(
  orgSlug: string,
  locale: 'ar' | 'en',
  branchSlug?: string,
): Promise<PublicMenuFetchResult> {
  const path =
    branchSlug === undefined
      ? `/v1/public/menus/${orgSlug}`
      : `/v1/public/menus/${orgSlug}/branches/${branchSlug}`;
  const res = await fetch(apiUrl(path, { locale }));
  if (res.status === 404) {
    throw new Response('Not Found', { status: 404 });
  }
  if (res.status === 410) {
    throw new Response('Gone', { status: 410 });
  }
  if (!res.ok) {
    throw new Response('Upstream error', { status: 502 });
  }
  const menu = publicMenuPayloadSchema.parse(await res.json());
  return {
    menu,
    cacheControl: res.headers.get('cache-control') ?? 'public, s-maxage=60, stale-while-revalidate=600',
  };
}

export async function fetchPublicTable(token: string): Promise<PublicTablePayload> {
  const res = await fetch(apiUrl(`/v1/public/tables/${encodeURIComponent(token)}`));
  if (res.status === 404) {
    throw new Response('Not Found', { status: 404 });
  }
  if (!res.ok) {
    throw new Response('Upstream error', { status: 502 });
  }
  return publicTablePayloadSchema.parse(await res.json());
}

export async function fetchPublicSitemap(): Promise<PublicSitemapResponse> {
  const res = await fetch(apiUrl('/v1/public/sitemap'));
  if (!res.ok) {
    throw new Response('Upstream error', { status: 502 });
  }
  return publicSitemapResponseSchema.parse(await res.json());
}
