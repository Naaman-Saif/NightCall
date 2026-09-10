import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '_python_scrapped/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      'max-lines': ['error', { max: 100, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 20, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 2],
      'max-depth': ['error', 2],
      'no-warning-comments': 'off',
    },
  },
  {
    files: ['**/*.spec.ts'],
    rules: { 'max-lines-per-function': 'off' },
  },
);
