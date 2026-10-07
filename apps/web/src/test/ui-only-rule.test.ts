import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

import { uiOnly } from '@app/eslint-config/ui-only';

import { uiOnlyFiles } from '../../eslint.config.js';

// Lints sample sources with only the UI-only rule, so a config change cannot silently disable it.
const eslint = new ESLint({
  cwd: process.cwd(),
  overrideConfigFile: true,
  overrideConfig: [
    { languageOptions: { ecmaVersion: 'latest', sourceType: 'module' } },
    uiOnly(uiOnlyFiles),
  ],
});

async function ruleIdsFor(code: string, filePath: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return result?.messages.flatMap((m) => (m.ruleId ? [m.ruleId] : [])) ?? [];
}

const component = 'src/features/orders/components/OrdersTable.tsx';

describe('UI-only ESLint rule', () => {
  it.each([
    ["import { useState } from 'react';", 'no-restricted-imports'],
    ["import { useEffect, useMemo } from 'react';", 'no-restricted-imports'],
    ["import { useSelector } from 'react-redux';", 'no-restricted-imports'],
    ["import { createSlice } from '@reduxjs/toolkit';", 'no-restricted-imports'],
    ["import { io } from 'socket.io-client';", 'no-restricted-imports'],
    ["import { useGetOrdersQuery } from '../orders.api.js';", 'no-restricted-imports'],
    ["import * as React from 'react'; export const x = React.useState(0);", 'no-restricted-syntax'],
  ])('rejects %s in a feature component', async (code, ruleId) => {
    expect(await ruleIdsFor(code, component)).toContain(ruleId);
  });

  it('applies to pages too', async () => {
    const ids = await ruleIdsFor(
      "import { useState } from 'react';",
      'src/features/orders/pages/OrdersPage.tsx',
    );
    expect(ids).toContain('no-restricted-imports');
  });

  it.each([
    'src/features/menu/screens/MenuScreen.tsx',
    'src/features/menu/sortable/SortableList.tsx',
    'src/features/menu/MenuRoutes.tsx',
  ])('applies to every feature .tsx folder: %s', async (filePath) => {
    const ids = await ruleIdsFor("import { useState } from 'react';", filePath);
    expect(ids).toContain('no-restricted-imports');
  });

  it('allows UI imports in components', async () => {
    const code =
      "import { Button } from '@app/ui'; import { useTranslation } from 'react-i18next';";
    expect(await ruleIdsFor(code, component)).toEqual([]);
  });

  it('does not apply to view-model hooks', async () => {
    const ids = await ruleIdsFor(
      "import { useState } from 'react';",
      'src/features/orders/hooks/use-orders-page.ts',
    );
    expect(ids).toEqual([]);
  });
});
