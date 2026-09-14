// Flat ESLint config (ESLint 9+) shared by every workspace package.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.expo/**',
      '**/coverage/**',
      '**/android/**',
      '**/ios/**',
      '**/.turbo/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Node-executed config/tooling files (not app source): allow CommonJS globals and require().
    files: [
      '**/babel.config.js',
      '**/metro.config.js',
      '**/tailwind.config.js',
      '**/jest.config.js',
      '**/jest.setup.js',
    ],
    languageOptions: {
      globals: { module: 'readonly', require: 'readonly', __dirname: 'readonly', process: 'readonly' },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/jest.setup.js', '**/*.test.ts', '**/*.test.tsx'],
    languageOptions: {
      globals: { jest: 'readonly', describe: 'readonly', it: 'readonly', expect: 'readonly', beforeEach: 'readonly', afterEach: 'readonly', beforeAll: 'readonly', afterAll: 'readonly' },
    },
  },
];
