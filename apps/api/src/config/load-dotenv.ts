import { existsSync } from 'node:fs';
import path from 'node:path';

import { config } from 'dotenv';

let loaded = false;

/**
 * Loads the first `.env` found (repo root when cwd is apps/api, or cwd).
 * Does not override variables already set in the process environment.
 */
export function loadDotenvFromMonorepoRoot(): void {
  if (loaded) {
    return;
  }
  loaded = true;

  const candidates = [
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
  ];

  for (const envPath of candidates) {
    if (existsSync(envPath)) {
      config({ path: envPath, override: false });
      return;
    }
  }
}

/** @internal tests */
export function resetDotenvLoadedForTests(): void {
  loaded = false;
}
