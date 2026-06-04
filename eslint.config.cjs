const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const legacyConfig = require('./.eslintrc.js');

const tsPluginWithCompatRules = {
  ...tsPlugin,
  rules: {
    ...tsPlugin.rules,
    'no-parameter-properties': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Compatibility shim for legacy inline disable comments.',
        },
        schema: [],
      },
      create() {
        return {};
      },
    },
    'no-object-literal-type-assertion': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Compatibility shim for legacy inline disable comments.',
        },
        schema: [],
      },
      create() {
        return {};
      },
    },
  },
};
const tsRecommendedRules = tsPlugin.configs.recommended?.rules || {};
const legacyRules = Object.fromEntries(
  Object.entries(legacyConfig.rules).filter(([ruleName]) => !ruleName.startsWith('react/')),
);

module.exports = [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'src-tauri/**',
      'src/.umi/**',
      'src/.umi-production/**',
      '**/*.less',
      '**/*.d.ts',
    ],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        __APP_PORT__: 'readonly',
        __APP_VERSION__: 'readonly',
        __BUILD_TIME__: 'readonly',
        __ENV__: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        navigator: 'readonly',
        window: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPluginWithCompatRules,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...tsRecommendedRules,
      ...legacyRules,
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'eol-last': 'off',
      'newline-per-chained-call': 'off',
      'no-param-reassign': 'off',
      'prefer-arrow-callback': 'off',
    },
  },
];
