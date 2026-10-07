import react from '@app/eslint-config/react';
import { uiOnly } from '@app/eslint-config/ui-only';
import { eslintTsconfigRootDir } from '@app/eslint-config/eslint-tsconfig-root-dir';

const tsconfigRootDir = eslintTsconfigRootDir(import.meta.url);

const typedFiles = ['**/*.{ts,tsx}', 'vite.config.ts', 'vitest.config.ts'];

/** Files that must stay UI only (props in, JSX out). */
export const uiOnlyFiles = [
  'src/features/**/*.tsx',
  'src/areas/**/*.tsx',
];

export default [
  { ignores: ['dist/**'] },
  ...react,
  {
    files: typedFiles,
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir,
      },
    },
  },
  uiOnly(uiOnlyFiles),
];
