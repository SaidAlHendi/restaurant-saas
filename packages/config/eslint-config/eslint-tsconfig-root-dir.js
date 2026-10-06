import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * @param {string | URL} metaUrl `import.meta.url` from the package eslint.config.js
 * @returns {string}
 */
export function eslintTsconfigRootDir(metaUrl) {
  return path.dirname(fileURLToPath(metaUrl));
}
