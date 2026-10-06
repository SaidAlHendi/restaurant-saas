// Enforces `.cursor/rules/45-components-ui-only.mdc`: feature .tsx files render props only.
// State, effects, Redux, RTK Query and sockets belong in .ts view-model hooks.

const LOGIC_HOOKS = [
  'useState',
  'useEffect',
  'useLayoutEffect',
  'useReducer',
  'useMemo',
  'useCallback',
  'useRef',
];

const HOOK_MESSAGE =
  'Feature .tsx files are UI only. Move state and effects to a view-model hook in hooks/*.ts (see 45-components-ui-only.mdc).';

/**
 * @param {string[]} files globs the rule applies to
 * @returns {import('eslint').Linter.Config}
 */
export function uiOnly(files) {
  return {
    files,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', importNames: LOGIC_HOOKS, message: HOOK_MESSAGE },
            { name: 'react-redux', message: HOOK_MESSAGE },
            { name: '@reduxjs/toolkit', message: HOOK_MESSAGE },
            { name: '@reduxjs/toolkit/query/react', message: HOOK_MESSAGE },
            { name: 'socket.io-client', message: HOOK_MESSAGE },
          ],
          patterns: [
            {
              group: ['**/*.api', '**/*.api.js', '**/*.api.ts'],
              message: 'Call RTK Query endpoints from a view-model hook, not from a .tsx file.',
            },
          ],
        },
      ],
      // Blocks the `React.useState(...)` form, which no-restricted-imports cannot see.
      'no-restricted-syntax': [
        'error',
        {
          selector: `CallExpression[callee.type='MemberExpression'][callee.object.name='React'][callee.property.name=/^(${LOGIC_HOOKS.join('|')})$/]`,
          message: HOOK_MESSAGE,
        },
      ],
    },
  };
}
