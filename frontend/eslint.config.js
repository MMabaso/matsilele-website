// ESLint (works on Node 20.9+ / 22.0+). Run with: npm run lint
import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      // Style advice from the React Compiler rules: shown as warnings, not build failures
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      // Effects must not return values: `useEffect(() => doThing(), ...)` returns doThing()'s result,
      // which crashes React if it's anything but a function (e.g. a Promise from scrollTo in newer browsers).
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='useEffect'] > ArrowFunctionExpression[expression=true]",
          message: 'Wrap the effect body in braces so it returns nothing: useEffect(() => { ... }, deps)',
        },
      ],
    },
  },
)
