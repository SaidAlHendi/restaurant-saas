import nest from '@app/eslint-config/nest';
import { eslintTsconfigRootDir } from '@app/eslint-config/eslint-tsconfig-root-dir';

const tsconfigRootDir = eslintTsconfigRootDir(import.meta.url);

const typedFiles = ['**/*.ts', 'jest.config.ts', 'drizzle.config.ts', 'test/jest-e2e.config.ts'];

export default [
  { ignores: ['dist/**'] },
  ...nest,
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
