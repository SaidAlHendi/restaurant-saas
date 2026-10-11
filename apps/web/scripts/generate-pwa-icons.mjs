/**
 * Generates 192/512 PNG PWA icons (and maskable 512) into apps/web/public/.
 * Run from apps/api (sharp dependency): node ../web/scripts/generate-pwa-icons.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(scriptDir, '..', 'public');

const theme = '#065f46';
const fg = '#ffffff';

function iconSvg(size, maskable) {
  if (!maskable) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${String(size)}" height="${String(size)}" viewBox="0 0 ${String(size)} ${String(size)}">
  <rect width="100%" height="100%" fill="${theme}" rx="${String(Math.round(size * 0.12))}"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,sans-serif" font-size="${String(Math.round(size * 0.32))}" font-weight="700" fill="${fg}">R</text>
</svg>`;
  }
  const safe = Math.round(size * 0.8);
  const offset = Math.round((size - safe) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${String(size)}" height="${String(size)}" viewBox="0 0 ${String(size)} ${String(size)}">
  <rect width="100%" height="100%" fill="${theme}"/>
  <rect x="${String(offset)}" y="${String(offset)}" width="${String(safe)}" height="${String(safe)}" rx="${String(Math.round(safe * 0.12))}" fill="${theme}" stroke="${fg}" stroke-width="${String(Math.max(2, Math.round(size * 0.02)))}"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,sans-serif" font-size="${String(Math.round(safe * 0.38))}" font-weight="700" fill="${fg}">R</text>
</svg>`;
}

async function writeIcon(size, filename, maskable) {
  const png = await sharp(Buffer.from(iconSvg(size, maskable))).png().toBuffer();
  await writeFile(path.join(publicDir, filename), png);
}

await mkdir(publicDir, { recursive: true });
await writeIcon(192, 'icon-192.png', false);
await writeIcon(512, 'icon-512.png', false);
await writeIcon(512, 'icon-maskable-512.png', true);
