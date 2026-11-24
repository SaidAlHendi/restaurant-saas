// Configuration, all overridable with environment variables.
const env = process.env;

export const config = {
  apiUrl: (env.API_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  webUrl: (env.WEB_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  siteUrl: (env.SITE_URL ?? 'http://localhost:5174').replace(/\/$/, ''),
  adminUrl: (env.ADMIN_URL ?? 'http://localhost:5175').replace(/\/$/, ''),
  // Platform admin (create with: ADMIN_PASSWORD=... pnpm --filter @app/api admin:create --email ... --role super).
  // Without these, every platform-admin test is reported as SKIPPED.
  adminEmail: env.E2E_ADMIN_EMAIL ?? '',
  adminPassword: env.E2E_ADMIN_PASSWORD ?? '',
  // Password given to every user the run creates.
  password: env.E2E_PASSWORD ?? 'e2e-Password-12345',
  outDir: env.E2E_OUT_DIR ?? new URL('../reports/', import.meta.url).pathname,
  timeoutMs: Number(env.E2E_TIMEOUT_MS ?? 15000),
  // Unique per run so repeated runs never collide on emails or slugs.
  runId: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
};
