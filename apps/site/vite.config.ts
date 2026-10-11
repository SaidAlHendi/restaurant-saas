import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig, loadEnv } from 'vite';

const siteRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(siteRoot, '../..');

export default defineConfig(({ mode }) => {
  // Server loaders read process.env (env.server.ts). Vite does not put .env values there, so copy the
  // PUBLIC_* values from the repo-root .env for `react-router dev`. Real env vars win; production
  // (`react-router-serve`) gets them from its environment.
  const fileEnv = loadEnv(mode, repoRoot, 'PUBLIC_');
  for (const [key, value] of Object.entries(fileEnv)) {
    process.env[key] ??= value;
  }

  return {
    resolve: {
      alias: {
        '@app/shared': path.join(siteRoot, '../../packages/shared/src/index.ts'),
      },
    },
    plugins: [tailwindcss(), reactRouter()],
    server: {
      port: 5174,
    },
  };
});
