import fs from 'node:fs/promises';
import path from 'node:path';

import { loadEnv } from '../../config/env';

import { ALL_ORG_DEFINITIONS, productGlobalKey } from './data/index';
import type { UnsplashPhotoEntry } from './seed-images';
import { unsplashPhotosPath } from './seed-images';

type UnsplashSearchResult = {
  results: Array<{
    id: string;
    urls: { raw: string; regular: string };
    links: { download_location: string };
    user: { name: string; links: { html: string } };
  }>;
};

function sortEntries(entries: UnsplashPhotoEntry[]): UnsplashPhotoEntry[] {
  return [...entries].sort((a, b) => a.productKey.localeCompare(b.productKey));
}

class RateLimitedError extends Error {}

type SearchOutcome = {
  photo: UnsplashSearchResult['results'][0] | undefined;
  remaining: number | null;
};

async function searchPhoto(accessKey: string, query: string): Promise<SearchOutcome> {
  const params = new URLSearchParams({
    query,
    orientation: 'squarish',
    content_filter: 'high',
    per_page: '5',
  });
  const url = `https://api.unsplash.com/search/photos?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${accessKey}`, 'Accept-Version': 'v1' },
  });
  const remainingHeader = res.headers.get('X-Ratelimit-Remaining');
  const remaining = remainingHeader === null ? null : Number.parseInt(remainingHeader, 10);
  if (res.status === 403 || res.status === 429) {
    throw new RateLimitedError(`Unsplash refused the request (${String(res.status)})`);
  }
  if (!res.ok) {
    throw new Error(`Unsplash search failed: ${String(res.status)}`);
  }
  const body = (await res.json()) as UnsplashSearchResult;
  return {
    photo: body.results[0],
    remaining: remaining === null || Number.isNaN(remaining) ? null : remaining,
  };
}

async function pingDownloadLocation(accessKey: string, downloadLocation: string): Promise<void> {
  await fetch(downloadLocation, {
    headers: { Authorization: `Client-ID ${accessKey}`, 'Accept-Version': 'v1' },
  });
}

export async function runFetchUnsplashImages(): Promise<void> {
  const env = loadEnv();
  const accessKey = env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    throw new Error('UNSPLASH_ACCESS_KEY is required for pnpm db:seed:images');
  }

  const existing = await readEntries();
  const byKey = new Map(existing.map((e) => [e.productKey, e]));
  const pending = ALL_ORG_DEFINITIONS.flatMap((org) =>
    org.products
      .map((product) => ({ product, productKey: productGlobalKey(org.slug, product.key) }))
      .filter(({ productKey }) => !byKey.has(productKey)),
  );
  let resolved = 0;
  let noResults = 0;

  // Saved after every photo so a stop (rate limit, network, Ctrl+C) never loses searches.
  const save = async (): Promise<void> => {
    const sorted = sortEntries([...byKey.values()]);
    await writeEntries(sorted);
    await writeCredits(sorted);
  };
  const remainingMessage = (): string =>
    `${String(pending.length - resolved - noResults)} product(s) still need a photo`;

  for (const { product, productKey } of pending) {
    const query = `${product.unsplashQuery ?? product.name.en} food`;
    let outcome: SearchOutcome;
    try {
      outcome = await searchPhoto(accessKey, query);
    } catch (err: unknown) {
      if (err instanceof RateLimitedError) {
        process.stdout.write(
          `[seed-images] ${err.message}: hourly limit reached. Resolved ${String(resolved)} this run, ${remainingMessage()}. Run again later.\n`,
        );
        return;
      }
      throw err;
    }

    const { photo, remaining } = outcome;
    if (!photo) {
      noResults += 1;
      process.stderr.write(
        `[seed-images] No results for ${productKey} ("${query}"). Add an unsplashQuery override in its data file.\n`,
      );
    } else {
      await pingDownloadLocation(accessKey, photo.links.download_location);
      byKey.set(productKey, {
        productKey,
        query,
        photoId: photo.id,
        rawUrl: photo.urls.raw,
        authorName: photo.user.name,
        authorUrl: photo.user.links.html,
        photoUrl: photo.urls.regular,
      });
      resolved += 1;
      await save();
      process.stdout.write(`[seed-images] ${productKey} -> ${photo.id}\n`);
    }

    if (remaining === 0) {
      process.stdout.write(
        `[seed-images] Hourly limit reached. Resolved ${String(resolved)} this run, ${remainingMessage()}. Run again later.\n`,
      );
      return;
    }
  }

  await save();
  process.stdout.write(
    `[seed-images] Done. Resolved ${String(resolved)} new photo(s), ${String(noResults)} without results.\n`,
  );
}

async function readEntries(): Promise<UnsplashPhotoEntry[]> {
  try {
    const raw = await fs.readFile(unsplashPhotosPath(), 'utf8');
    return JSON.parse(raw) as UnsplashPhotoEntry[];
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

async function writeEntries(entries: UnsplashPhotoEntry[]): Promise<void> {
  await fs.writeFile(unsplashPhotosPath(), `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
}

async function writeCredits(entries: UnsplashPhotoEntry[]): Promise<void> {
  const creditsPath = path.join(process.cwd(), '..', '..', 'docs', 'seed-image-credits.md');
  const lines = [
    '# Seed image credits (Unsplash)',
    '',
    'Generated by `pnpm db:seed:images`. Do not edit by hand — re-run the script to refresh.',
    '',
    '| Product key | Photographer | Photo |',
    '| --- | --- | --- |',
  ];
  for (const entry of entries) {
    lines.push(
      `| ${entry.productKey} | [${entry.authorName}](${entry.authorUrl}) | [View](${entry.photoUrl}) |`,
    );
  }
  lines.push('');
  await fs.writeFile(creditsPath, `${lines.join('\n')}\n`, 'utf8');
}

async function main(): Promise<void> {
  if (loadEnv().NODE_ENV === 'production') {
    throw new Error('db:seed:images refuses to run when NODE_ENV=production');
  }
  await runFetchUnsplashImages();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
