import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@app/shared': path.join(siteRoot, '../../packages/shared/src/index.ts'),
    },
  },
  plugins: [tailwindcss(), reactRouter()],
  server: {
    port: 5174,
  },
});
