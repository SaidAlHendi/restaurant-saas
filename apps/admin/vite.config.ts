import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const adminRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    // @app/shared dist is CJS (for Nest); Vite/Rollup needs ESM, so bundle from source.
    alias: {
      '@app/shared': path.join(adminRoot, '../../packages/shared/src/index.ts'),
    },
  },
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    host: true,
  },
});
