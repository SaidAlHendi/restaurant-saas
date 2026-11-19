import fs from 'node:fs/promises';

import { loadEnv } from '../../config/env';

import { ALL_ORG_DEFINITIONS, productGlobalKey } from './data/index';
import type { UnsplashPhotoEntry } from './seed-images';
import { readUnsplashPhotos, unsplashPhotosPath } from './seed-images';

/**
 * Fills `unsplash-photos.json` with Pixabay photos for products that have no entry yet.
 * Same entry shape as the Unsplash script, so `pnpm db:seed:demo --images=on` works unchanged.
 * Pixabay allows 100 requests/minute and free commercial use without attribution.
 *
 * Usage: pnpm db:seed:images:pixabay [--org=seed-cafe-qahwa]
 */

type PixabayHit = {
  id: number;
  pageURL: string;
  largeImageURL: string;
  user: string;
  user_id: number;
};

type PixabayResponse = { hits: PixabayHit[] };

class RateLimitedError extends Error {}

const REQUEST_GAP_MS = 700;
const REQUEST_TIMEOUT_MS = 15_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function searchPixabay(
  apiKey: string,
  query: string,
  foodOnly: boolean,
): Promise<PixabayHit | undefined> {
  const params = new URLSearchParams({
    key: apiKey,
    q: query.slice(0, 100),
    image_type: 'photo',
    safesearch: 'true',
    per_page: '3',
  });
  if (foodOnly) {
    params.set('category', 'food');
  }
  const res = await fetch(`https://pixabay.com/api/?${params.toString()}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (res.status === 429) {
    throw new RateLimitedError('Pixabay rate limit reached (429)');
  }
  if (!res.ok) {
    throw new Error(`Pixabay search failed: ${String(res.status)}`);
  }
  const body = (await res.json()) as PixabayResponse;
  return body.hits[0];
}

async function findPhoto(apiKey: string, query: string): Promise<PixabayHit | undefined> {
  const foodHit = await searchPixabay(apiKey, query, true);
  if (foodHit) {
    return foodHit;
  }
  await sleep(REQUEST_GAP_MS);
  return searchPixabay(apiKey, `${query} food`, false);
}

function parseOrgFilter(argv: string[]): string | undefined {
  const arg = argv.find((a) => a.startsWith('--org='));
  const slug = arg?.slice('--org='.length).trim();
  return slug ? slug : undefined;
}

async function main(): Promise<void> {
  const env = loadEnv();
  if (env.NODE_ENV === 'production') {
    throw new Error('db:seed:images:pixabay refuses to run when NODE_ENV=production');
  }
  const apiKey = env.PIXABAY_API_KEY;
  if (!apiKey) {
    throw new Error('PIXABAY_API_KEY is required for pnpm db:seed:images:pixabay');
  }

  const orgFilter = parseOrgFilter(process.argv.slice(2));
  const orgs = ALL_ORG_DEFINITIONS.filter((org) => !orgFilter || org.slug === orgFilter);
  if (orgs.length === 0) {
    throw new Error(`No seed org matches --org=${orgFilter ?? ''}`);
  }

  const existing = await readUnsplashPhotos();
  const byKey = new Map<string, UnsplashPhotoEntry>(existing.map((e) => [e.productKey, e]));
  const pending = orgs.flatMap((org) =>
    org.products
      .map((product) => ({ product, productKey: productGlobalKey(org.slug, product.key) }))
      .filter(({ productKey }) => !byKey.has(productKey)),
  );

  // Saved after every photo so a stop (rate limit, network, Ctrl+C) never loses searches.
  const save = async (): Promise<void> => {
    const sorted = [...byKey.values()].sort((a, b) => a.productKey.localeCompare(b.productKey));
    await fs.writeFile(unsplashPhotosPath(), `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
  };

  let resolved = 0;
  let noResults = 0;
  for (const { product, productKey } of pending) {
    const query = product.unsplashQuery ?? product.name.en;
    let hit: PixabayHit | undefined;
    try {
      hit = await findPhoto(apiKey, query);
    } catch (err: unknown) {
      if (err instanceof RateLimitedError) {
        process.stdout.write(
          `[seed-images:pixabay] ${err.message}. Resolved ${String(resolved)} this run, ${String(pending.length - resolved - noResults)} still need a photo. Run again in a minute.\n`,
        );
        process.exitCode = 2;
        return;
      }
      throw err;
    }

    if (hit) {
      byKey.set(productKey, {
        productKey,
        query,
        photoId: `pixabay-${String(hit.id)}`,
        rawUrl: hit.largeImageURL,
        authorName: hit.user,
        authorUrl: `https://pixabay.com/users/${encodeURIComponent(hit.user)}-${String(hit.user_id)}/`,
        photoUrl: hit.pageURL,
      });
      resolved += 1;
      await save();
      process.stdout.write(`[seed-images:pixabay] ${productKey} -> ${String(hit.id)}\n`);
    } else {
      noResults += 1;
      process.stderr.write(
        `[seed-images:pixabay] No results for ${productKey} ("${query}"). Add an unsplashQuery override in its data file.\n`,
      );
    }
    await sleep(REQUEST_GAP_MS);
  }

  process.stdout.write(
    `[seed-images:pixabay] Done. Resolved ${String(resolved)} new photo(s), ${String(noResults)} without results.\n`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
