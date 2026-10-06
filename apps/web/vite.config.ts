import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Restaurant SaaS',
        short_name: 'Restaurant',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
      },
    }),
  ],
  server: {
    port: 5173,
    /** WSL: reachable from Windows browser at http://localhost:5173 */
    host: true,
  },
});
