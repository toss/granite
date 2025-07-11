/**
 * https://github.com/microsoft/vscode-eslint/issues/1620#issuecomment-2090780605
 */
 
const tseslint = require('typescript-eslint');
const { fixupPluginRules } = require('@eslint/compat');
const eslint = require('@eslint/js');
const prettierConfig = require('eslint-config-prettier');
const importPlugin = require('eslint-plugin-import');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const unicorn = require('eslint-plugin-unicorn');
const unusedImports = require('eslint-plugin-unused-imports');

function getCommonJSPackageRule(packages) {
  return {
    ignores: packages.map((name) => `packages/${name}`),
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // CommonJS 환경에서는 `require()` 호출이 가능하도록 규칙 비활성화
      '@typescript-eslint/no-var-requires': 'off',
    },
  };
}

module.exports = tseslint.config(
  {
    ignores: [
      'docs/',
      'packages/devtools-frontend/src/front_end/',
      'packages/mpack/src/vendors/metro*',
      'packages/create-granite-app/templates/*',
      'packages/create-granite-app/tool-templates/*',
      '**/fixtures/**/*',
      '**/dist/',
      '**/esm/',
      '**/.next/',
      '**/.next-local/',
      '**/bin/*.js',
      '.pnp.*',
      '.yarn/',
      '**/.granite/',
    ],
  },
  eslint.configs.recommended,
  prettierConfig,
  {
    plugins: { unicorn },
  },
  {
    rules: {
      'no-implicit-coercion': 'error',
      'no-warning-comments': [
        'warn',
        {
          terms: ['TODO', 'FIXME', 'XXX', 'BUG'],
          location: 'anywhere',
        },
      ],
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      // TypeScript에서 이미 잡고 있는 문제이기 때문에 + location, document 등의 global variable도 잡아서
      'no-undef': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': 'off',
    },
  },
  {
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-var-requires': 'warn',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'warn',
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        { format: ['camelCase', 'UPPER_CASE', 'PascalCase'], selector: 'variable', leadingUnderscore: 'allow' },
        { format: ['camelCase', 'PascalCase'], selector: 'function' },
        { format: ['PascalCase'], selector: 'interface' },
        { format: ['PascalCase'], selector: 'typeAlias' },
      ],
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      '@typescript-eslint/member-ordering': [
        'error',
        {
          default: [
            'public-static-field',
            'private-static-field',
            'public-instance-field',
            'private-instance-field',
            'public-constructor',
            'private-constructor',
            'public-instance-method',
            'private-instance-method',
          ],
        },
      ],
    },
  },
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      'import/no-duplicates': ['error', { 'prefer-inline': true }],
      'import/order': [
        2,
        {
          groups: ['builtin', 'external', ['parent', 'sibling'], 'index'],
          alphabetize: {
            order: 'asc',
            caseInsensitive: false,
          },
          'newlines-between': 'never',
        },
      ],
    },
  },
  {
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': fixupPluginRules(reactHooksPlugin),
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
    },
  },
  getCommonJSPackageRule(['mpack'])
);
