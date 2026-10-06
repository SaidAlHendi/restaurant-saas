import react from '@app/eslint-config/react';
import { eslintTsconfigRootDir } from '@app/eslint-config/eslint-tsconfig-root-dir';

const tsconfigRootDir = eslintTsconfigRootDir(import.meta.url);

const typedFiles = ['**/*.{ts,tsx}'];

export default [
  { ignores: ['dist/**'] },
  ...react,
  {
    files: ['src/components/button/button.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
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
