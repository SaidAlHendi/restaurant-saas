import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SOON_FEATURE_KEYS } from '@app/shared';

const SRC_ROOT = join(__dirname, '..', '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [full] : [];
  });
}

/** `@RequireFeature(...)`, `entitlements.can(...)`, `assertFeature(...)` with the key as a literal. */
function enforcementPattern(key: string): RegExp {
  const escaped = key.replace(/\./g, '\\.');
  return new RegExp(`(RequireFeature|assertFeature|\\.can)\\([^)]*['"\`]${escaped}['"\`]`);
}

describe('SOON_FEATURE_KEYS', () => {
  it('are not enforced anywhere in the API (remove the Soon label when a feature ships)', () => {
    const files = sourceFiles(SRC_ROOT).map((file) => ({ file, text: readFileSync(file, 'utf8') }));
    const enforced = SOON_FEATURE_KEYS.flatMap((key) =>
      files.filter(({ text }) => enforcementPattern(key).test(text)).map(({ file }) => `${key} in ${file}`),
    );
    expect(enforced).toEqual([]);
  });
});
