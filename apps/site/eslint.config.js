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
  // scripts/ holds plain Node build tools (no types, no browser); they are not part of the app.
  { ignores: ['build/**', '.react-router/**', 'scripts/**'] },
  ...react,
  {
    files: ['app/root.tsx', 'app/routes/**/*.{ts,tsx}', 'app/lib/**/*.ts'],
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
