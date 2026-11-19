/**
 * Renders the PWA PNG icons in apps/web/public/ from the SVG sources next to them
 * (icon-192.svg, icon-512.svg, icon-maskable-512.svg). Edit the SVGs, then run this.
 * Run from apps/api (sharp dependency): node ../web/scripts/generate-pwa-icons.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(scriptDir, '..', 'public');

async function writeIcon(name) {
  const svg = await readFile(path.join(publicDir, `${name}.svg`));
  const png = await sharp(svg).png().toBuffer();
  await writeFile(path.join(publicDir, `${name}.png`), png);
}

await writeIcon('icon-192');
await writeIcon('icon-512');
await writeIcon('icon-maskable-512');
