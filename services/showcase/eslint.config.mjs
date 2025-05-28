import pluginJs from '@eslint/js';
import pluginReact from 'eslint-plugin-react';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {ignores: ['**/node_modules/**', '**/dist/**', '*.{cjs,js}']},
  {files: ['pages/**/*.{ts,jsx,tsx}', 'src/**/*.{ts,jsx,tsx}']},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  pluginReact.configs.flat.recommended,
];
