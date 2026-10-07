import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

import webEslintConfig from '../../eslint.config.js';

const eslint = new ESLint({
  cwd: process.cwd(),
  overrideConfigFile: true,
  overrideConfig: webEslintConfig,
});

async function lintFile(relativePath: string) {
  const [result] = await eslint.lintFiles([relativePath]);
  return result?.messages.filter((message) => message.severity === 2) ?? [];
}

describe('menu feature eslint', () => {
  it('has no errors in view-model hooks and sortable lists', async () => {
    const paths = [
      'src/features/menu/hooks/use-categories-screen.ts',
      'src/features/menu/hooks/use-products-screen.ts',
      'src/features/menu/hooks/use-modifier-groups-screen.ts',
      'src/features/menu/hooks/use-optimistic-reorder.ts',
      'src/features/menu/hooks/use-product-image-upload.ts',
      'src/features/menu/sortable/CategorySortableList.tsx',
      'src/features/menu/sortable/ModifierSortableList.tsx',
      'src/features/menu/pages/CategoriesPage.tsx',
      'src/features/menu/pages/ProductsPage.tsx',
      'src/features/menu/pages/ModifierGroupsPage.tsx',
      'src/features/menu/components/ProductsPageView.tsx',
    ];

    const failures: string[] = [];
    for (const path of paths) {
      const errors = await lintFile(path);
      for (const error of errors) {
        failures.push(`${path}:${String(error.line)} ${error.ruleId ?? 'error'} ${error.message}`);
      }
    }

    expect(failures).toEqual([]);
  });
});
