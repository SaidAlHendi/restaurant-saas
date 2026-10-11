/**
 * Generates 192/512 PNG PWA icons (and maskable 512) into apps/web/public/.
 * Run from repo root: node apps/web/scripts/generate-pwa-icons.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(scriptDir, '..', 'public');

const theme = '#065f46';
const fg = '#ffffff';

async function writeIcon(size, filename, maskable) {
  const padding = maskable ? Math.round(size * 0.1) : 0;
  const inner = size - padding * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${String(size)}" height="${String(size)}" viewBox="0 0 ${String(size)} ${String(size)}">
  <rect width="100%" height="100%" fill="${theme}"/>
  <rect x="${String(padding)}" y="${String(padding)}" width="${String(inner)}" height="${String(inner)}" rx="${String(Math.round(inner * 0.12))}" fill="${theme}"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,sans-serif" font-size="${String(Math.round(size * 0.28))}" font-weight="700" fill="${fg}">R</text>
</svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  await writeFile(path.join(publicDir, filename), png);
}

await mkdir(publicDir, { recursive: true });
await writeIcon(192, 'icon-192.png', false);
await writeIcon(512, 'icon-512.png', false);
await writeIcon(512, 'icon-maskable-512.png', true);
