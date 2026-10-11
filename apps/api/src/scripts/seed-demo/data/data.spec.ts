import { ALL_ORG_DEFINITIONS } from './index';
import type { LocalizedText, OrgSeedDefinition } from './types';

/** Latin or Cyrillic letters must never appear in Arabic copy. */
const NON_ARABIC_LETTERS = /[A-Za-zЀ-ӿ]/;

function allTexts(org: OrgSeedDefinition): Array<{ where: string; text: LocalizedText }> {
  return [
    { where: 'org', text: org.name },
    ...org.branches.flatMap((b) => [
      { where: `branch ${b.key}`, text: b.name },
      { where: `branch ${b.key} city`, text: b.city },
    ]),
    ...org.categories.map((c) => ({ where: `category ${c.key}`, text: c.name })),
    ...org.modifierGroups.flatMap((g) => [
      { where: `group ${g.key}`, text: g.name },
      ...g.modifiers.map((m) => ({ where: `modifier ${g.key}.${m.key}`, text: m.name })),
    ]),
    ...org.products.flatMap((p) => [
      { where: `product ${p.key}`, text: p.name },
      { where: `product ${p.key} description`, text: p.description },
    ]),
  ];
}

describe.each(ALL_ORG_DEFINITIONS.map((org) => [org.slug, org] as const))(
  'seed data %s',
  (_slug, org) => {
    it('writes Arabic copy in Arabic script only', () => {
      const bad = allTexts(org)
        .filter(({ text }) => text.ar.trim() === '' || NON_ARABIC_LETTERS.test(text.ar))
        .map(({ where, text }) => `${where}: ${text.ar}`);
      expect(bad).toEqual([]);
    });

    it('has unique product keys that point at real categories and groups', () => {
      const keys = org.products.map((p) => p.key);
      expect(new Set(keys).size).toBe(keys.length);

      const categoryKeys = new Set(org.categories.map((c) => c.key));
      const groupKeys = new Set(org.modifierGroups.map((g) => g.key));
      const badRefs = org.products.flatMap((p) => [
        ...(categoryKeys.has(p.categoryKey) ? [] : [`${p.key} -> category ${p.categoryKey}`]),
        ...(p.modifierGroupKeys ?? [])
          .filter((g) => !groupKeys.has(g))
          .map((g) => `${p.key} -> group ${g}`),
      ]);
      expect(badRefs).toEqual([]);
    });

    it('has a full menu: at least 8 products in every visible category', () => {
      const thin = org.categories
        .filter((c) => !c.deleted)
        .map((c) => ({
          key: c.key,
          count: org.products.filter((p) => p.categoryKey === c.key).length,
        }))
        .filter((c) => c.count < 8);
      expect(thin).toEqual([]);
    });
  },
);
