import react from '@app/eslint-config/react';
import { uiOnly } from '@app/eslint-config/ui-only';
import { eslintTsconfigRootDir } from '@app/eslint-config/eslint-tsconfig-root-dir';

const tsconfigRootDir = eslintTsconfigRootDir(import.meta.url);

/** Files that must stay UI only (props in, JSX out). */
export const uiOnlyFiles = ['src/features/**/*.tsx'];

export default [
  { ignores: ['.next/**', 'next-env.d.ts', '*.mjs'] },
  ...react,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    // Next.js pages and layouts export metadata and default components together.
    files: ['src/app/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  uiOnly(uiOnlyFiles),
];
