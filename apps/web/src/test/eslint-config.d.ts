declare module '@app/eslint-config/ui-only' {
  import type { Linter } from 'eslint';
  export function uiOnly(files: string[]): Linter.Config;
}
