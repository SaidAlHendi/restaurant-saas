import node from '@app/eslint-config/node';
import { eslintTsconfigRootDir } from '@app/eslint-config/eslint-tsconfig-root-dir';

const tsconfigRootDir = eslintTsconfigRootDir(import.meta.url);

const typedFiles = ['**/*.ts'];

export default [
  { ignores: ['dist/**'] },
  ...node,
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
