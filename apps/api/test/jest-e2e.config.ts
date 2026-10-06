import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: '.e2e-spec.ts$',
  globalSetup: '<rootDir>/global-setup.ts',
  setupFiles: ['<rootDir>/env.setup.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@app/shared$': '<rootDir>/../../../packages/shared/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.e2e.json',
      },
    ],
  },
};

export = config;
