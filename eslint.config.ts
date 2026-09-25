import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Repository-wide ESLint configuration.
 * Rules enforce docs/docs/development/coding-standards.md (SOLID guard rails + layer boundaries).
 */
export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/out/**',
      '**/release/**',
      '**/coverage/**',
      'native/**',
      'docs/.docusaurus/**',
      'docs/build/**',
      '**/*.config.ts',
      'docs/sidebars.ts',
    ],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // SOLID-oriented guard rails
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 4],
      complexity: ['error', 12],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: ['packages/core/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['electron', 'node:*', 'react', 'react-dom', 'fs', 'path', 'child_process'],
              message: 'packages/core must stay platform independent (no Electron, Node or DOM).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/desktop/src/main/domain/**/*.ts', 'apps/desktop/src/main/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['electron', 'node:*', '**/infrastructure/**', '**/infrastructure'],
              message:
                'Application/domain code depends only on ports (DIP). Wire concrete classes in bootstrap.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/desktop/src/renderer/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['electron', 'node:*', '**/main/**', '**/preload/**'],
              message: 'The renderer talks to the main process only through window.magwin.',
            },
          ],
        },
      ],
    },
  },
  {
    // Hooks live in .ts files too (usePaletteSelection, useLive).
    files: ['apps/desktop/src/renderer/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
  },
  {
    files: ['**/*.tsx'],
    rules: {
      // React components can legitimately be longer than pure functions.
      'max-lines-per-function': ['error', { max: 120, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/test/**/*.ts', '**/test/**/*.tsx'],
    rules: {
      'max-lines-per-function': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/unbound-method': 'off',
      // Test doubles may rely on inferred types (e.g. vitest mocks).
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  prettier,
);
