import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

import webEslintConfig from '../../eslint.config.js';

const eslint = new ESLint({
  cwd: process.cwd(),
  overrideConfigFile: true,
  overrideConfig: webEslintConfig,
});

describe('menu feature eslint', () => {
  it(
    'has no errors in view-model hooks and sortable lists',
    async () => {
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

      const results = await eslint.lintFiles(paths);
      const failures: string[] = [];
      for (const result of results) {
        const filePath = result.filePath.replace(`${process.cwd()}/`, '');
        for (const error of result.messages) {
          if (error.severity !== 2) {
            continue;
          }
          failures.push(
            `${filePath}:${String(error.line)} ${error.ruleId ?? 'error'} ${error.message}`,
          );
        }
      }

      expect(failures).toEqual([]);
    },
    15_000,
  );
});
