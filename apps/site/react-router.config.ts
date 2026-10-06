import type { Config } from '@react-router/dev/config';

export default {
  ssr: true,
  prerender: ['/', '/ar', '/en'],
} satisfies Config;
