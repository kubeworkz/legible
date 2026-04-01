import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';

/** @type {import('eslint').Linter.Config[]} */
const config = [
  // Ignores
  {
    ignores: [
      '.next/**/*',
      'node_modules/**/*',
      'src/apollo/client/graphql/__types__.ts',
      'src/apollo/client/graphql/*.generated.ts',
    ],
  },

  // Next.js core-web-vitals (flat config natively in v16)
  ...nextCoreWebVitals,

  // TypeScript-ESLint recommended
  ...tseslint.configs.recommended,

  // Prettier plugin + base rules
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      '@next/next/no-html-link-for-pages': 'off',
      'react/display-name': 'off',
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // Disable rules new in typescript-eslint v8 (not in original config)
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      // Disable React Compiler rules (react-hooks v5+, not using React Compiler)
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/static-components': 'off',
    },
  },

  // TS/TSX/JS/JSX overrides
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@next/next/no-html-link-for-pages': ['error', 'src/pages'],
      '@next/next/no-img-element': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
];

export default config;
