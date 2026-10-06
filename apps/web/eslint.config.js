import react from '@app/eslint-config/react';
import { eslintTsconfigRootDir } from '@app/eslint-config/eslint-tsconfig-root-dir';

const tsconfigRootDir = eslintTsconfigRootDir(import.meta.url);

const typedFiles = ['**/*.{ts,tsx}', 'vite.config.ts', 'vitest.config.ts'];

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
];
