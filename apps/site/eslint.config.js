import react from '@app/eslint-config/react';
import { eslintTsconfigRootDir } from '@app/eslint-config/eslint-tsconfig-root-dir';

const tsconfigRootDir = eslintTsconfigRootDir(import.meta.url);

const typedFiles = [
  '**/*.{ts,tsx}',
  'vite.config.ts',
  'vitest.config.ts',
  'react-router.config.ts',
];

export default [
  { ignores: ['build/**', '.react-router/**'] },
  ...react,
  {
    files: ['app/root.tsx', 'app/routes/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/only-throw-error': [
        'error',
        { allow: [{ from: 'lib', name: 'Response' }] },
      ],
    },
  },
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
