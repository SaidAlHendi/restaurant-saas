import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const webRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    // @app/shared dist is CJS (for Nest); Vite/Rollup needs ESM — bundle from source.
    alias: {
      '@app/shared': path.join(webRoot, '../../packages/shared/src/index.ts'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-512.png',
        'pos.webmanifest',
        'manifest.webmanifest',
      ],
      manifest: {
        name: 'Restaurant SaaS',
        short_name: 'Restaurant',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#065f46',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^\/(?!api)/],
      },
    }),
  ],
  server: {
    port: 5173,
    /** WSL: reachable from Windows browser at http://localhost:5173 */
    host: true,
  },
});
